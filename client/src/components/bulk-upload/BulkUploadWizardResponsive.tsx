import React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { BulkUploadWizard } from './BulkUploadWizard';
import { BulkUploadWizardMobile } from './BulkUploadWizardMobile';
import type { BulkUploadWizardProps } from './types';

/**
 * Responsive Bulk Upload Wizard
 * 
 * Automatically switches between desktop modal and mobile drawer
 * based on screen size and device capabilities.
 */
export const BulkUploadWizardResponsive: React.FC<BulkUploadWizardProps> = (props) => {
  // Check if device is mobile/tablet
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTouchDevice = useMediaQuery('(pointer: coarse)');
  
  // Use mobile version for small screens or touch devices
  const useMobileVersion = isMobile || isTouchDevice;

  if (useMobileVersion) {
    return <BulkUploadWizardMobile {...props} />;
  }

  return <BulkUploadWizard {...props} />;
};

export default BulkUploadWizardResponsive;