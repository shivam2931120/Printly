import React from 'react';
import { PricingConfig, ShopConfig, User } from '../types';
import { PrintPage } from './print/PrintPage';

interface StudentPortalProps {
 currentUser: User | null;
 onSignInClick: () => void;
 pricing: PricingConfig;
 shopConfig: ShopConfig;
}

export const StudentPortal: React.FC<StudentPortalProps> = (props) => {
 return <PrintPage {...props} />;
};
