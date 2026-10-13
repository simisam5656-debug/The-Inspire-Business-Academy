/**
 * The Inspire Business Academy - Payment Methods Configuration
 * Source of Truth: PRD Section 7 & Phase 8 Business Rules
 * Confirmed Official Academy Contact: 0309-3534289
 */

export interface PaymentAccountDetails {
  id: 'jazzcash' | 'easypaisa' | 'bank_transfer';
  title: string;
  titleRomanUrdu: string;
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  instructions: string;
  instructionsRomanUrdu: string;
  badge: string;
  iconName: string;
}

export const OFFICIAL_PAYMENT_METHODS: PaymentAccountDetails[] = [
  {
    id: 'jazzcash',
    title: 'JazzCash Mobile Account',
    titleRomanUrdu: 'JazzCash Mobile Account',
    accountTitle: 'The Inspire Business Academy',
    accountNumber: '0309-3534289',
    instructions: 'Send fee via JazzCash app or retailer to 0309-3534289. Note down the 12-digit TID from SMS 8558.',
    instructionsRomanUrdu: 'JazzCash App ya dukan se 0309-3534289 par raqam transfer karein. 8558 SMS se aane wali 12-digit TID note karein.',
    badge: 'Fast & Instant',
    iconName: 'Smartphone',
  },
  {
    id: 'easypaisa',
    title: 'Easypaisa Mobile Account',
    titleRomanUrdu: 'Easypaisa Mobile Account',
    accountTitle: 'The Inspire Business Academy',
    accountNumber: '0309-3534289',
    instructions: 'Send fee via Easypaisa app or retailer to 0309-3534289. Note down the TRX ID received from 3737.',
    instructionsRomanUrdu: 'Easypaisa App ya shop se 0309-3534289 par fee bhejein. 3737 SMS se received TRX ID note karein.',
    badge: 'Instant Verification',
    iconName: 'Wallet',
  },
  {
    id: 'bank_transfer',
    title: 'Bank Online Transfer (IBFT)',
    titleRomanUrdu: 'Bank Online Transfer (IBFT)',
    accountTitle: 'The Inspire Business Academy',
    accountNumber: 'Contact Administration / 0309-3534289 for IBAN',
    bankName: 'Official Academy Corporate Account (Ask via WhatsApp)',
    instructions: 'For Direct Bank Transfer / Raast / IBFT, verify account details from WhatsApp helpline 0309-3534289.',
    instructionsRomanUrdu: 'Direct Bank Transfer / Raast / IBFT ke liye WhatsApp helpline 0309-3534289 se official IBAN confirm karein.',
    badge: 'Direct IBFT',
    iconName: 'Building',
  },
];
