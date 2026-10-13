/**
 * The Inspire Business Academy - Verified FAQs
 * Source of truth: Official PRD business facts
 */

import { siteConfig } from './site';

export interface FAQItem {
  id: string;
  question: string;
  questionRomanUrdu: string;
  answer: string;
  answerRomanUrdu: string;
  category: 'physical' | 'online' | 'admissions' | 'general';
}

export const OFFICIAL_FAQS: FAQItem[] = [
  {
    id: 'faq-physical-vs-online',
    question: 'What is the difference between Physical Academy and Online Learning?',
    questionRomanUrdu: 'Physical Academy aur Online Learning mein kya farq hai?',
    answer: 'In the Physical Academy, students attend daily lab classes at our Sadiqabad campus with access to academy computers, in-person mentorship, and weekly tests. In Online Learning, students access recorded lectures from anywhere with automated progress tracking and self-paced study.',
    answerRomanUrdu: 'Physical Academy mein tulba hamare Sadiqabad campus aate hain jahan unhein computer lab, ustad ki nigrani aur haftawar tests milte hain. Online Learning mein tulba ghar baithe recorded lectures dekh kar seekhte hain.',
    category: 'general',
  },
  {
    id: 'faq-laptop-facility',
    question: 'Can I join the physical academy if I do not own a laptop?',
    questionRomanUrdu: 'Agar mere paas apna laptop na ho toh kya main physical academy join kar sakta/sakti hoon?',
    answer: 'Yes! The Inspire Business Academy provides computer lab facilities at our Sadiqabad campus during batch hours so students without personal laptops can practice and complete all coursework.',
    answerRomanUrdu: 'Jee haan! The Inspire Business Academy apne Sadiqabad campus par computer lab ki sahulat faraham karti hai taake jin tulba ke paas laptop nahi woh bhi ba-asani seekh sakein.',
    category: 'physical',
  },
  {
    id: 'faq-batch-timings',
    question: 'What are the physical batch timings and working days?',
    questionRomanUrdu: 'Physical batches ke auqat aur working days kya hain?',
    answer: 'Classes run Monday through Friday (Saturday & Sunday are off). Batches are strictly organized: Girls Batch 1 (9:00 AM - 11:30 AM), Boys Batch 1 (12:00 PM - 2:00 PM), Girls Batch 2 (2:00 PM - 4:00 PM), and Boys Batch 2 (4:30 PM - 7:00 PM).',
    answerRomanUrdu: 'Monday ta Friday classes hoti hain (Hafta aur Itwar chutti hai). Batches ke auqat yeh hain: Girls Batch 1 (9:00 AM - 11:30 AM), Boys Batch 1 (12:00 PM - 2:00 PM), Girls Batch 2 (2:00 PM - 4:00 PM), aur Boys Batch 2 (4:30 PM - 7:00 PM).',
    category: 'physical',
  },
  {
    id: 'faq-physical-package-fee',
    question: 'What is the fee structure for the 6-month Physical Academy package?',
    questionRomanUrdu: 'Physical Academy ke 6-mah package ki fee kya hai?',
    answer: `The physical package duration is ${siteConfig.physicalPackage.durationMonths} months covering all ${siteConfig.physicalPackage.courseCount} courses together in one package. Monthly lab charges are Rs. ${siteConfig.physicalPackage.monthlyFee.toLocaleString()} (total for six months is Rs. ${siteConfig.physicalPackage.totalPackage.toLocaleString()}). There is no admission fee (Rs. ${siteConfig.physicalPackage.admissionFee}) and no hidden charges. Classes run ${siteConfig.physicalPackage.schedule}.`,
    answerRomanUrdu: `Physical package ki muddat ${siteConfig.physicalPackage.durationMonths} mah hai jisme tamam ${siteConfig.physicalPackage.courseCount} courses aik sath shamil hain. Mahana lab charges Rs. ${siteConfig.physicalPackage.monthlyFee.toLocaleString()} hain (chhe mah ka kul package Rs. ${siteConfig.physicalPackage.totalPackage.toLocaleString()} banta hai). Dakhla fees bilkul Rs. ${siteConfig.physicalPackage.admissionFee} hai aur koi hidden charges nahi hain. Classes ${siteConfig.physicalPackage.schedule} hoti hain.`,
    category: 'admissions',
  },
  {
    id: 'faq-online-courses-pricing',
    question: 'What is the fee and access duration for Online Courses?',
    questionRomanUrdu: 'Online courses ki fee aur access kitne arsay ka hota hai?',
    answer: `Online courses are priced as set by the academy administration (standard Rs. ${siteConfig.onlineCourses.defaultPrice.toLocaleString()} per course) with ${siteConfig.onlineCourses.defaultAccessDurationMonths} months of continuous access to recorded lectures.`,
    answerRomanUrdu: `Online courses ki fee academy administration ke mutabiq hoti hai (standard Rs. ${siteConfig.onlineCourses.defaultPrice.toLocaleString()} fi course) jisme ${siteConfig.onlineCourses.defaultAccessDurationMonths} mah tak recorded lectures ki rasai di jaati hai.`,
    category: 'online',
  },
  {
    id: 'faq-passing-mark',
    question: 'What is the passing threshold for the final course exam?',
    questionRomanUrdu: 'Final course exam mein pass hone ke liye kitne marks zaroori hain?',
    answer: 'The final exam pass threshold is strictly 70%. Achieving at least 70% is mandatory to qualify for course completion and certificate issuance.',
    answerRomanUrdu: 'Course mukammal karne aur sanad (certificate) ke husool ke liye final exam mein kam az kam 70% number hasil karna lazmi hai.',
    category: 'general',
  },
  {
    id: 'faq-attendance-rule',
    question: 'Does watching recorded videos automatically mark online attendance?',
    questionRomanUrdu: 'Kya video dekhne se online attendance khud-ba-khud lag jaati hai?',
    answer: 'No. Video watching percentage tracks learning progress only. Attendance is verified and marked manually by academy administration.',
    answerRomanUrdu: 'Nahi. Video dekhne ki percentage sirf progress show karti hai. Hazri (attendance) academy administration khud jaanch kar lagati hai.',
    category: 'online',
  },
  {
    id: 'faq-certificate-verification',
    question: 'How can employers or institutions verify an academy certificate?',
    questionRomanUrdu: 'Academy ki sanad (certificate) ki tasdeeq kaise hoti hai?',
    answer: 'Every issued certificate carries a unique verification code and secure token. Anyone can visit our /verify page and instantly verify recipient details, course, and issue status.',
    answerRomanUrdu: 'Har sanad par ek makhsoos verification code aur secure token hota hai jise hamari website par /verify page par daal kar foran asaliyat check ki ja sakti hai.',
    category: 'general',
  },
  {
    id: 'faq-contact-admissions',
    question: 'How do I start admission or ask further questions?',
    questionRomanUrdu: 'Dakhla lene ya mazeed maloomat ke liye kaise rabta karein?',
    answer: `Connect with us directly on WhatsApp at ${siteConfig.whatsapp} or visit our campus in Sadiqabad, Punjab during regular business hours.`,
    answerRomanUrdu: `Direct hamare WhatsApp number ${siteConfig.whatsapp} par rabta karein ya Sadiqabad campus tashreef layein.`,
    category: 'admissions',
  },
];
