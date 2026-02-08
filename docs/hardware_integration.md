# Hardware Integration Guide for Printly

This guide outlines the architecture and steps required to integrate Printly with local physical printers for auto-releasing jobs.

## Architecture Overview

Since Printly is a web application running in a browser, it **cannot** directly access local hardware (USB/Network printers) due to browser security sandboxing.

To achieve direct printing, you need a **Local Print Agent** (Bridge) that sits between the Printly Backend (Supabase/API) and the physical printer.

### Components
1.  **Printly Web App**: Where users submit PDF files.
2.  **Supabase/Backend**: Stores the PDF files and job status ("PENDING").
3.  **Local Print Agent**: A software running on the computer connected to the printer.
4.  **Physical Printer**: The hardware device.

## Step 1: The Local Print Agent
You need to build a small desktop utility (using Node.js/Electron, Python, or Go) that runs on the shop owner's computer.

### Agent Logic (Pseudo-code)
```python
while True:
    # 1. Poll Supabase for new "PENDING" jobs for this Shop ID
    jobs = supabase.table('OrderItems').select('*').eq('status', 'PENDING')
    
    for job in jobs:
        # 2. Download the PDF file
        pdf_path = download_file(job['fileUrl'])
        
        # 3. Send to Printer (OS native command)
        # Windows: print /d:PrinterName file.pdf
        # Linux: lp -d PrinterName file.pdf
        print_result = os.system(f"lp -d {PRINTER_NAME} {pdf_path}")
        
        if print_result == SUCCESS:
            # 4. Update Status to "PRINTED"
            supabase.table('OrderItems').update({'status': 'PRINTED'}).eq('id', job['id'])
    
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
- The Agent needs a **Service Role Key** or a dedicated **Admin User** token to query all jobs.
- Secure the agent so it only processes jobs for the specific `ShopID` it is configured for.

## Detailed Flow
1.  **Student** uploads `thesis.pdf` -> Saved to Supabase Storage. Order Status: `PENDING`.
2.  **Local Agent** (running at shop) detects new row in `Order` table via Supabase Realtime subscription.
3.  **Local Agent** downloads `thesis.pdf` to a temporary folder config options (e.g., `copies=2`, `duplex=true`).
4.  **Local Agent** executes OS print command.
5.  **Printer** starts printing.
6.  **Local Agent** updates Order Status to `COMPLETED` on Supabase.
7.  **Student** sees "Completed" on their screen instantly.
