import React from 'react';
import { LegalDocPage } from './LegalDocPage';

export const RefundPage: React.FC = () => (
  <LegalDocPage
    canonicalPath="/refund"
    titleEn="Refund Policy"
    titleRoman="Refund Policy (Raqam Wapsi Ki Policy)"
    descriptionEn="When refunds are possible for online and physical admissions at The Inspire Business Academy, and how to request one."
    descriptionRoman="The Inspire Business Academy mein online aur physical dakhlay par refund kab mumkin hai aur darkhwast kaise dein."
    sections={[
      {
        titleEn: 'Overview',
        titleRoman: 'Mukhtasar Jaiza',
        paragraphsEn: [
          'We want every student to feel confident before paying. This policy explains when a refund is possible. Because digital course access is delivered immediately after payment verification, refunds are limited and reviewed case by case.',
        ],
        paragraphsRoman: [
          'Hum chahte hain ke har student adaigi se pehle mutmaeen ho. Yeh policy batati hai ke refund kab mumkin hai. Kyun ke digital course access payment verify hote hi mil jata hai, is liye refund mehdood hai aur har case alag dekha jata hai.',
        ],
      },
      {
        titleEn: 'Refunds That Are Possible',
        titleRoman: 'Jab Refund Mumkin Hai',
        bulletsEn: [
          'Duplicate payment: the same course was paid for more than once.',
          'Wrong amount: you paid more than the price shown for your course.',
          'Access not delivered: your payment was verified but the academy could not provide access to the course.',
          'Payment rejected or unverified: the academy could not verify your payment and you request your money back.',
        ],
        bulletsRoman: [
          'Duplicate payment: ek hi course ki payment ek se zyada baar ho gayi.',
          'Ghalat raqam: aapne course ki dikhai gayi qeemat se zyada raqam ada ki.',
          'Access na milna: payment verify ho gayi lekin academy course ka access nahi de saki.',
          'Payment reject ya verify na hona: academy payment verify na kar saki aur aap raqam wapas mangein.',
        ],
      },
      {
        titleEn: 'Refunds That Are Not Possible',
        titleRoman: 'Jab Refund Mumkin Nahi',
        bulletsEn: [
          'After you have received course access and started using the lessons, quizzes or exams, except for the cases listed above.',
          'Change of mind, lack of time, or not completing the course within your access period.',
          'Accounts suspended for sharing logins, copying or distributing content, or cheating.',
          'Payments made with fake, edited or reused proof.',
        ],
        bulletsRoman: [
          'Course access milne aur lessons, quizzes ya exams istemal karne ke baad, siwaye upar likhay gaye halaat ke.',
          'Iraada badalna, waqt ki kami, ya access ki muddat mein course mukammal na karna.',
          'Login share karne, content copy/taqseem karne ya cheating par suspend hone wale accounts.',
          'Jali, edit shuda ya dobara istemal hui proof se ki gayi adaigiyan.',
        ],
      },
      {
        titleEn: 'Physical Academy Admission',
        titleRoman: 'Physical Academy Dakhla',
        paragraphsEn: [
          'Fees already paid for a month of classes that has started are not refundable. If you decide not to continue, contact the academy before the next month begins so the next installment is not due. Any special case is decided by the academy administration.',
        ],
        paragraphsRoman: [
          'Jis mahine ki classes shuru ho chuki hon uski ada shuda fees wapas nahi hoti. Agar aap jaari na rakhna chahein to agla mahina shuru hone se pehle academy se rabta karein taake agli qist wajib na ho. Koi khaas surat academy intizamia tay karti hai.',
        ],
      },
      {
        titleEn: 'How to Request a Refund',
        titleRoman: 'Refund Ki Darkhwast Kaise Dein',
        bulletsEn: [
          'Contact the academy on WhatsApp with your full name, course name, transaction ID and the reason.',
          'We review your request after checking the payment record and your portal activity.',
          'If approved, the amount is sent back to the same account/number it was paid from. Processing time depends on the bank or wallet.',
        ],
        bulletsRoman: [
          'Academy ko WhatsApp par apna mukammal naam, course ka naam, transaction ID aur wajah bhejein.',
          'Hum payment record aur aapki portal activity dekh kar darkhwast review karte hain.',
          'Manzoori ki soorat mein raqam usi account/number par wapas bheji jati hai jis se ada hui thi. Muddat bank ya wallet par munhasir hai.',
        ],
      },
    ]}
  />
);
