import { useState, useEffect, useCallback } from 'react';
import { CmsService } from '../services/cmsService';
import { siteConfig } from '../config/site';

export interface ActivePaymentMethod {
  id: 'jazzcash' | 'easypaisa' | 'bank_transfer';
  name: string;
  title: string;
  titleRomanUrdu: string;
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  iban?: string;
  instructions: string;
  instructionsRomanUrdu: string;
  badge: string;
  icon: 'smartphone' | 'wallet' | 'building';
}

export function usePaymentMethods() {
  const [methods, setMethods] = useState<ActivePaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await CmsService.getSiteSettings();
      const active: ActivePaymentMethod[] = [];

      const defaultTitle = settings.academyName || siteConfig.name;
      const defaultPhone = settings.phone || siteConfig.phone;

      // JazzCash
      if (settings.paymentJazzcashEnabled !== false) {
        const jcNumber = settings.paymentJazzcashNumber?.trim() || defaultPhone;
        active.push({
          id: 'jazzcash',
          name: 'JazzCash',
          title: 'JazzCash Mobile Account',
          titleRomanUrdu: 'JazzCash Mobile Account',
          accountTitle: settings.paymentJazzcashTitle?.trim() || defaultTitle,
          accountNumber: jcNumber,
          instructions: `Send fee via JazzCash app or retailer to ${jcNumber}. Note down the 12-digit TID from SMS 8558.`,
          instructionsRomanUrdu: `JazzCash App ya dukan se ${jcNumber} par raqam transfer karein. 8558 SMS se aane wali 12-digit TID note karein.`,
          badge: 'Fast & Instant',
          icon: 'smartphone',
        });
      }

      // Easypaisa
      if (settings.paymentEasypaisaEnabled !== false) {
        const epNumber = settings.paymentEasypaisaNumber?.trim() || defaultPhone;
        active.push({
          id: 'easypaisa',
          name: 'Easypaisa',
          title: 'Easypaisa Mobile Account',
          titleRomanUrdu: 'Easypaisa Mobile Account',
          accountTitle: settings.paymentEasypaisaTitle?.trim() || defaultTitle,
          accountNumber: epNumber,
          instructions: `Send fee via Easypaisa app or retailer to ${epNumber}. Note down the TRX ID received from 3737.`,
          instructionsRomanUrdu: `Easypaisa App ya shop se ${epNumber} par fee bhejein. 3737 SMS se received TRX ID note karein.`,
          badge: 'Instant Verification',
          icon: 'wallet',
        });
      }

      // Bank Transfer (disabled by default, only included when explicitly enabled)
      if (settings.paymentBankEnabled === true) {
        const bName = settings.paymentBankName?.trim() || 'Official Academy Bank Account';
        const bAccNumber = settings.paymentBankAccountNumber?.trim() || 'Contact Administration';
        const bIban = settings.paymentBankIban?.trim() || '';
        const displayAcc = bIban ? `${bAccNumber} (IBAN: ${bIban})` : bAccNumber;

        active.push({
          id: 'bank_transfer',
          name: 'Bank Transfer',
          title: 'Bank Online Transfer (IBFT)',
          titleRomanUrdu: 'Bank Online Transfer (IBFT)',
          accountTitle: settings.paymentBankAccountTitle?.trim() || defaultTitle,
          accountNumber: displayAcc,
          bankName: bName,
          iban: bIban,
          instructions: `Transfer via online banking / mobile banking app to ${bName}. Enter TID/transaction reference.`,
          instructionsRomanUrdu: `${bName} par online banking app ke zariye raqam muntaqil karein aur transaction reference note karein.`,
          badge: 'Direct IBFT',
          icon: 'building',
        });
      }

      setMethods(active);
    } catch (err: any) {
      console.error('Failed to load payment methods from settings:', err);
      setError(err?.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  return { methods, loading, error, reload: loadMethods };
}
