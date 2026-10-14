import React from 'react';
import { LegalDocPage } from './LegalDocPage';

export const TermsPage: React.FC = () => (
  <LegalDocPage
    canonicalPath="/terms"
    titleEn="Terms & Conditions"
    titleRoman="Sharait o Zawabit (Terms & Conditions)"
    descriptionEn="Terms and conditions for admission, online access, payments and certificates at The Inspire Business Academy."
    descriptionRoman="The Inspire Business Academy mein dakhla, online access, adaigi aur sanad ke sharait o zawabit."
    sections={[
      {
        titleEn: 'Acceptance of Terms',
        titleRoman: 'Sharait Ki Manzoori',
        paragraphsEn: [
          'By applying for admission, creating an account, or using our website, physical campus or online portal, you agree to these Terms & Conditions.',
        ],
        paragraphsRoman: [
          'Dakhla ki darkhwast dene, account banane, ya hamari website, campus ya online portal istemal karne ka matlab hai ke aap in sharait o zawabit se ittefaq karte hain.',
        ],
      },
      {
        titleEn: 'Admission & Eligibility',
        titleRoman: 'Dakhla Aur Ahliyat',
        bulletsEn: [
          'Admission is confirmed only after the academy reviews and approves your request.',
          'Information you provide (name, phone, email, guardian details) must be correct and your own.',
          'Physical admission requires a father/guardian name. The academy may contact you for an interview or seat confirmation.',
        ],
        bulletsRoman: [
          'Dakhla tab confirm hota hai jab academy aapki darkhwast review karke manzoor kar de.',
          'Aapki di hui maloomat (naam, phone, email, sarparast ki details) durust aur aapki apni honi chahiye.',
          'Physical dakhla ke liye walid/sarparast ka naam zaroori hai. Academy interview ya seat confirmation ke liye rabta kar sakti hai.',
        ],
      },
      {
        titleEn: 'Online Courses, Payments & Access',
        titleRoman: 'Online Courses, Adaigi Aur Access',
        bulletsEn: [
          'Online course fees are paid manually (JazzCash, Easypaisa or bank transfer) and proved with a transaction ID and screenshot.',
          'Course access is activated only after the academy verifies your payment. Fake, edited or reused payment proofs lead to rejection and account action.',
          'The price shown on the course page at the time of payment is the price you pay. Valid coupons or offers are applied by the academy.',
          'Access lasts for the period shown in your student portal. Expired access can be renewed by the academy.',
        ],
        bulletsRoman: [
          'Online course ki fees manual tareeqay se (JazzCash, Easypaisa ya bank transfer) ada ki jati hai aur transaction ID aur screenshot se saabit ki jati hai.',
          'Course access sirf payment verify hone ke baad active hota hai. Jali, edit shuda ya dobara istemal hui payment proof par darkhwast reject aur account par karwai ho sakti hai.',
          'Payment ke waqt course page par jo qeemat nazar aati hai wahi ada karni hoti hai. Durust coupons ya offers academy lagati hai.',
          'Access ki muddat aapke student portal mein nazar aati hai. Khatam hone par academy access renew kar sakti hai.',
        ],
      },
      {
        titleEn: 'Student Conduct & Account Use',
        titleRoman: 'Student Ka Rawayya Aur Account Ka Istemal',
        bulletsEn: [
          'Your account is personal. Do not share your login, copy, record, resell or distribute course videos, notes or exam content.',
          'Cheating in quizzes or final exams, or misuse of the portal, can lead to suspension and certificate cancellation.',
          'Respectful behaviour is required at the campus and in all academy communication channels.',
        ],
        bulletsRoman: [
          'Aapka account zaati hai. Apna login share na karein, aur course videos, notes ya exam content ko copy, record, farokht ya taqseem na karein.',
          'Quiz ya final exam mein cheating ya portal ke ghalat istemal par account suspend aur sanad mansookh ho sakti hai.',
          'Campus aur academy ke tamam rabta zarayo par izzat o ehtram se pesh aana zaroori hai.',
        ],
      },
      {
        titleEn: 'Exams & Certificates',
        titleRoman: 'Imtihan Aur Sanad',
        paragraphsEn: [
          'Certificates are issued only to students who meet the course requirements, including passing the final exam at the pass mark set by the academy. Every certificate has a unique code that can be checked on our Verify page. The academy may revoke a certificate if it was obtained through fraud.',
        ],
        paragraphsRoman: [
          'Sanad sirf unhi tulba ko di jati hai jo course ki shara-it poori karein, jin mein academy ke muqarrar karda pass mark par final exam pass karna shamil hai. Har sanad ka alag code hota hai jo hamare Verify page par check kiya ja sakta hai. Fraud se hasil ki gayi sanad academy mansookh kar sakti hai.',
        ],
      },
      {
        titleEn: 'Content & Changes',
        titleRoman: 'Content Aur Tabdeeliyan',
        paragraphsEn: [
          'All course content, branding and materials belong to The Inspire Business Academy. Course content, prices, schedules and these terms may be updated from time to time; the version published on this page applies.',
        ],
        paragraphsRoman: [
          'Course ka tamam content, branding aur materials The Inspire Business Academy ki milkiyat hain. Course content, qeematein, schedule aur yeh sharait waqtan fawaqtan tabdeel ho sakti hain; is page par shaya shuda version laagu hoga.',
        ],
      },
      {
        titleEn: 'Refunds & Contact',
        titleRoman: 'Refund Aur Rabta',
        paragraphsEn: [
          'Refunds are governed by our Refund Policy page. For any question about these terms, contact the academy using the details below.',
        ],
        paragraphsRoman: [
          'Refunds hamari Refund Policy ke mutabiq hotay hain. In sharait ke baare mein kisi sawal ke liye neeche di gayi details par academy se rabta karein.',
        ],
      },
    ]}
  />
);
