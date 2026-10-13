import { siteConfig } from './site';

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
    accountTitle: siteConfig.name,
    accountNumber: siteConfig.phone,
    instructions: `Send fee via JazzCash app or retailer to ${siteConfig.phone}. Note down the 12-digit TID from SMS 8558.`,
    instructionsRomanUrdu: `JazzCash App ya dukan se ${siteConfig.phone} par raqam transfer karein. 8558 SMS se aane wali 12-digit TID note karein.`,
    badge: 'Fast & Instant',
    iconName: 'Smartphone',
  },
  {
    id: 'easypaisa',
    title: 'Easypaisa Mobile Account',
    titleRomanUrdu: 'Easypaisa Mobile Account',
    accountTitle: siteConfig.name,
    accountNumber: siteConfig.phone,
    instructions: `Send fee via Easypaisa app or retailer to ${siteConfig.phone}. Note down the TRX ID received from 3737.`,
    instructionsRomanUrdu: `Easypaisa App ya shop se ${siteConfig.phone} par fee bhejein. 3737 SMS se received TRX ID note karein.`,
    badge: 'Instant Verification',
    iconName: 'Wallet',
  },
  {
    id: 'bank_transfer',
    title: 'Bank Online Transfer (IBFT)',
    titleRomanUrdu: 'Bank Online Transfer (IBFT)',
    accountTitle: siteConfig.name,
    accountNumber: `Contact Administration / ${siteConfig.whatsapp} for IBAN`,
    bankName: 'Official Academy Corporate Account (Ask via WhatsApp)',
    instructions: `For Direct Bank Transfer / Raast / IBFT, verify account details from WhatsApp helpline ${siteConfig.whatsapp}.`,
    instructionsRomanUrdu: `Direct Bank Transfer / Raast / IBFT ke liye WhatsApp helpline ${siteConfig.whatsapp} se official IBAN confirm karein.`,
    badge: 'Direct IBFT',
    iconName: 'Building',
  },
];
