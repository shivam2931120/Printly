# Hardware Integration Guide for Printly

This guide outlines the architecture and steps required to integrate Printly with local physical printers for auto-releasing jobs.

## Architecture Overview

Since Printly is a web application running in a browser, it **cannot** directly access local hardware (USB/Network printers) due to browser security sandboxing.

To achieve direct printing, you need a **Local Print Agent** (Bridge) that sits between the Printly Backend (Supabase/API) and the physical printer.

### Components
1.  **Printly Web App**: Where users submit PDF files.
2.  **Supabase/Backend**: Stores uploaded files in the `prints` bucket and stores order/job state on the `Order` row.
3.  **Local Print Agent**: Software running on the computer connected to the printer.
4.  **Physical Printer**: The hardware device.

## Step 1: The Local Print Agent
You need to build a small desktop utility (using Node.js/Electron, Python, or Go) that runs on the shop owner's computer.

### Agent Logic (Pseudo-code)
```python
while True:
    # 1. Poll Supabase for paid orders that are ready to print for this Shop ID
    jobs = (
        supabase.table('Order')
        .select('*')
        .in_('status', ['CONFIRMED', 'PRINTING'])
        .or_('inventoryProcessed.is.null,inventoryProcessed.eq.false,printJobStatus.eq.failed')
        .lt('printJobAttempts', MAX_JOB_ATTEMPTS)
        .eq('shopId', SHOP_ID)
    )
    
    for job in jobs:
        # 2. Download the PDF file
        file_url = first_print_item(job['items'])['fileUrl']
        pdf_path = download_file(file_url)
        
        # 3. Send to Printer (OS native command)
        # Windows: print /d:PrinterName file.pdf
        # Linux: lp -d PrinterName file.pdf
        print_result = os.system(f"lp -d {PRINTER_NAME} {pdf_path}")
        
        if print_result == SUCCESS:
            # 4. Mark the order as printed/processed
            supabase.table('Order').update({
                'status': 'READY',
                'inventoryProcessed': True,
                'printJobStatus': 'completed'
            }).eq('id', job['id'])
    
    # Wait for 10 seconds before next poll
    sleep(10)
```

## Step 2: Implementation Technologies

### Option A: Electron App (Recommended)
Build a desktop app using Electron (React + Node.js).
- **Pros**: Can share code with the web app, has full OS access (Node.js `child_process`).
- **Libraries**: `node-printer` or `pdf-to-printer` (NPM).

### Option B: Python Script
A simple Python script running as a background service.
- **Pros**: Very easy to write, robust libraries (`requests`, `subprocess`).
- **OS commands**:
  - Windows: `SumatraPDF.exe -print-to-default file.pdf`
  - Linux/Mac: `lp file.pdf`

## Step 3: Security & Auth
- The Agent needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in its local environment. The service role key is server-side only and must never be exposed in the web app.
- Secure the agent so it only processes jobs for the specific `ShopID` it is configured for.

## Detailed Flow
1.  **Student** uploads `thesis.pdf` -> Saved to Supabase Storage. Unpaid order is created as `PENDING`.
2.  **Payment succeeds** -> Order becomes `CONFIRMED` with `paymentStatus = PAID`.
3.  **Local Agent** (running at shop) polls the `Order` table for unprocessed `CONFIRMED`/`PRINTING` rows.
4.  **Local Agent** downloads `thesis.pdf` to a temporary folder and applies print options from `Order.items` (for example `copies=2`, `duplex=true`).
5.  **Local Agent** executes OS print command.
6.  **Printer** starts printing.
7.  **Local Agent** marks `inventoryProcessed = true`, stores print job status, and can move the order to `READY`.
8.  **Student** sees the updated status in the app.
