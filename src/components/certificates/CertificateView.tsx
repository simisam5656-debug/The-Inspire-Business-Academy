import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { CertificateRecord } from '../../types';
import { CertificateService } from '../../services/certificateService';
import { Award, CheckCircle2, AlertTriangle, Printer, Copy, Check, ExternalLink, ShieldCheck, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useTranslation } from '../../i18n';

interface CertificateViewProps {
  certificate: CertificateRecord;
  showActions?: boolean;
}

export const CertificateView: React.FC<CertificateViewProps> = ({
  certificate,
  showActions = true,
}) => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const verificationUrl = CertificateService.getVerificationUrl(
    certificate.verificationToken || certificate.certificateCode
  );

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(verificationUrl, {
      width: 160,
      margin: 1,
      color: {
        dark: '#0F1F5C',
        light: '#FFFFFF',
      },
    })
      .then((url: string) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err: any) => console.error('Error generating QR code:', err));

    return () => {
      active = false;
    };
  }, [verificationUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    try {
      setDownloadingPng(true);
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 1130;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1600, 1130);

      // Outer Navy Border
      ctx.strokeStyle = '#0F1F5C';
      ctx.lineWidth = 24;
      ctx.strokeRect(20, 20, 1560, 1090);

      // Inner Gold Border
      ctx.strokeStyle = '#FFC20E';
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, 1520, 1050);

      // Thin Inner Frame
      ctx.strokeStyle = '#1F3FBF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(55, 55, 1490, 1020);

      // Academy Header
      ctx.fillStyle = '#0F1F5C';
      ctx.font = 'bold 44px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE INSPIRE BUSINESS ACADEMY', 800, 140);

      ctx.fillStyle = '#1F3FBF';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('GOVERNMENT CERTIFIED SKILL DEVELOPMENT & ENTREPRENEURSHIP', 800, 180);

      // Gold Divider Line
      ctx.strokeStyle = '#FFC20E';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(700, 210);
      ctx.lineTo(900, 210);
      ctx.stroke();

      // Diploma Title
      ctx.fillStyle = '#475569';
      ctx.font = 'italic 28px Georgia, serif';
      ctx.fillText('Certificate of Professional Graduation', 800, 260);

      ctx.fillStyle = '#64748B';
      ctx.font = '18px sans-serif';
      ctx.fillText('This is proudly presented in recognition of the successful completion of:', 800, 310);

      // Student Name
      ctx.fillStyle = '#0F1F5C';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.fillText(certificate.recipientName, 800, 390);

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(400, 415);
      ctx.lineTo(1200, 415);
      ctx.stroke();

      // Courses List
      const courses = certificate.courseTitles && certificate.courseTitles.length > 0
        ? certificate.courseTitles
        : [certificate.courseTitle];

      ctx.fillStyle = '#1F3FBF';
      ctx.font = 'bold 30px Georgia, serif';
      if (courses.length === 1) {
        ctx.fillText(courses[0], 800, 480);
      } else {
        const joined = courses.join('  •  ');
        ctx.fillText(joined, 800, 480);
      }

      // Duration & Score
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 20px sans-serif';
      const durationLine = certificate.durationText ? `Program Duration: ${certificate.durationText}` : '';
      const scoreLine = certificate.scorePercentage
        ? `Score: ${certificate.scorePercentage}% (${certificate.finalGrade || 'Passed'})`
        : '';
      const metaLine = [durationLine, scoreLine].filter(Boolean).join('    |    ');
      if (metaLine) {
        ctx.fillText(metaLine, 800, 540);
      }

      // Track Type
      ctx.fillStyle = '#64748B';
      ctx.font = '16px sans-serif';
      const trackType = certificate.studentType === 'online' ? 'Online Certified Program' : 'Physical Academy Diploma';
      ctx.fillText(`Official Credential Type: ${trackType}`, 800, 580);

      // Footer - Credentials Code & Date
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('CREDENTIAL CODE', 120, 920);

      ctx.fillStyle = '#0F1F5C';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(certificate.certificateCode, 120, 955);

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('ISSUE DATE', 120, 1000);

      ctx.fillStyle = '#334155';
      ctx.font = '18px sans-serif';
      ctx.fillText(
        new Date(certificate.issueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        120,
        1030
      );

      // Authorized Signatures
      ctx.textAlign = 'right';
      ctx.fillStyle = '#475569';
      ctx.font = 'italic 20px Georgia, serif';
      ctx.fillText('Inspire Academic Board', 1480, 960);

      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(1250, 980);
      ctx.lineTo(1480, 980);
      ctx.stroke();

      ctx.fillStyle = '#0F1F5C';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Director of Academics', 1480, 1010);
      ctx.fillStyle = '#64748B';
      ctx.font = '14px sans-serif';
      ctx.fillText('The Inspire Business Academy', 1480, 1035);

      // QR Code in Center
      if (qrDataUrl) {
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 725, 870, 150, 150);
          ctx.textAlign = 'center';
          ctx.fillStyle = '#64748B';
          ctx.font = '13px sans-serif';
          ctx.fillText('Scan QR to Verify Official Credential', 800, 1045);

          // Download PNG
          const pngUrl = canvas.toDataURL('image/png');
          const dl = document.createElement('a');
          dl.download = `IBA-Certificate-${certificate.certificateCode}.png`;
          dl.href = pngUrl;
          dl.click();
          setDownloadingPng(false);
        };
        qrImg.src = qrDataUrl;
      } else {
        const pngUrl = canvas.toDataURL('image/png');
        const dl = document.createElement('a');
        dl.download = `IBA-Certificate-${certificate.certificateCode}.png`;
        dl.href = pngUrl;
        dl.click();
        setDownloadingPng(false);
      }
    } catch (err) {
      console.error('Download PNG failed:', err);
      setDownloadingPng(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isRevoked = certificate.status === 'revoked';

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden during window.print) */}
      {showActions && (
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isRoman ? 'Sanad Ka Status:' : 'Credential Status:'}
            </span>
            {isRevoked ? (
              <Badge variant="danger" size="md">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                {isRoman ? 'Revoke Shuda' : 'Revoked'}
              </Badge>
            ) : (
              <Badge variant="success" size="md">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {isRoman ? 'Tasdeeq Shuda (Valid)' : 'Verified Official'}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? (isRoman ? 'Link Copy Ho Gaya!' : 'Copied!') : (isRoman ? 'Verification Link' : 'Copy Verification Link')}
            </Button>

            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F3FBF] hover:text-[#0F1F5C] bg-[#F2F5FF] hover:bg-blue-100 rounded-lg border border-[#1F3FBF]/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isRoman ? 'Public Verify Check' : 'Live Verification'}</span>
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPng}
              disabled={downloadingPng}
              className="text-xs bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>{downloadingPng ? (isRoman ? 'PNG Ban Raha Hai...' : 'Generating PNG...') : (isRoman ? 'Download PNG' : 'Download PNG')}</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="text-xs bg-[#1F3FBF] hover:bg-[#0F1F5C]"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              <span>{isRoman ? 'Print / Download PDF' : 'Print / Download PDF'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Revocation Warning Banner if applicable */}
      {isRevoked && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 flex items-start gap-3 print:hidden">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold text-rose-800">
              {isRoman ? 'Yeh Sanad Mansookh (Revoke) Ki Ja Chuki Hai' : 'This Certificate Has Been Officially Revoked'}
            </h4>
            <p className="mt-1 text-rose-700">
              <strong>{isRoman ? 'Waja:' : 'Reason:'}</strong> {certificate.revocationReason || 'Administrative revocation'}
            </p>
            {certificate.revokedAt && (
              <p className="text-xs text-rose-600 mt-1">
                {isRoman ? 'Revocation Tareekh:' : 'Revoked on:'} {new Date(certificate.revokedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Certificate Frame (Optimized for Screen & Print) */}
      <div
        ref={certRef}
        id="official-certificate-container"
        className={`relative w-full max-w-4xl mx-auto bg-[#FDFEFE] text-[#0F1F5C] p-8 sm:p-12 md:p-16 rounded-2xl shadow-xl border-8 border-double border-[#0F1F5C] print:border-4 print:shadow-none print:m-0 print:p-8 print:w-full print:max-w-none overflow-hidden ${
          isRevoked ? 'opacity-85' : ''
        }`}
        style={{
          boxShadow: '0 20px 40px -15px rgba(15, 31, 92, 0.2)',
        }}
      >
        {/* Revoked Watermark */}
        {isRevoked && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            <div className="transform -rotate-45 border-8 border-rose-600 text-rose-600 font-black text-6xl sm:text-8xl px-12 py-4 tracking-widest uppercase opacity-25">
              REVOKED
            </div>
          </div>
        )}

        {/* Decorative Corner Ornaments */}
        <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-[#FFC20E]" />
        <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-[#FFC20E]" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-[#FFC20E]" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-[#FFC20E]" />

        {/* Inner Gold Frame */}
        <div className="border border-[#FFC20E]/60 p-6 sm:p-10 rounded-lg text-center relative z-10 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center gap-2 text-[#1F3FBF] mb-1">
              <Award className="w-8 h-8 text-[#FFC20E]" />
              <ShieldCheck className="w-6 h-6 text-[#1F3FBF]" />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-wider text-[#0F1F5C] font-display">
              The Inspire Business Academy
            </h2>

            <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-[#1F3FBF]">
              Government Certified Skill Development & Entrepreneurship
            </p>

            <div className="w-24 h-1 bg-[#FFC20E] mx-auto my-3 rounded-full" />

            <h3 className="text-lg sm:text-xl font-serif italic text-slate-700 tracking-wide">
              Certificate of Professional Graduation
            </h3>
          </div>

          {/* Presentation Statement */}
          <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-lg mx-auto">
            This is proudly presented in recognition of the successful completion and demonstrated competence of:
          </p>

          {/* Recipient Name */}
          <div className="py-2">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#0F1F5C] tracking-tight font-serif capitalize border-b-2 border-slate-300 inline-block px-8 pb-2">
              {certificate.recipientName}
            </h1>
          </div>

          {/* Program Details */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm text-slate-600">
              for fulfilling all curriculum modules, practical assessments, and the official final examination for:
            </p>

            {certificate.courseTitles && certificate.courseTitles.length > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-2 py-1">
                {certificate.courseTitles.map((cTitle, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#0F1F5C] font-bold rounded-lg border border-blue-200 text-sm sm:text-base font-serif"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#1F3FBF]" />
                    {cTitle}
                  </span>
                ))}
              </div>
            ) : (
              <h4 className="text-lg sm:text-2xl font-bold text-[#1F3FBF]">
                {certificate.courseTitle}
              </h4>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-slate-700 font-medium">
              {certificate.durationText && (
                <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  <span>Duration:</span>
                  <strong className="text-slate-900">{certificate.durationText}</strong>
                </span>
              )}

              {certificate.scorePercentage && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span>Examination Score:</span>
                  <strong className="text-emerald-700 font-bold">{certificate.scorePercentage}%</strong>
                  {certificate.finalGrade && (
                    <span className="text-[#0F1F5C]">({certificate.finalGrade})</span>
                  )}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              Program Type: {certificate.studentType === 'online' ? 'Online Certified Program' : 'Physical Academy Diploma'}
            </p>
          </div>

          {/* Footer: Signatures & QR Code */}
          <div className="pt-8 mt-6 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 items-end gap-6 text-left">
            {/* Left: Issue Date & Serial Code */}
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Credential Code
              </span>
              <span className="text-xs font-mono font-bold text-[#0F1F5C] block">
                {certificate.certificateCode}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider pt-2">
                Issue Date
              </span>
              <span className="text-xs font-medium text-slate-700 block">
                {new Date(certificate.issueDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            {/* Center: Official QR Code */}
            <div className="flex flex-col items-center justify-center text-center space-y-1.5">
              {qrDataUrl ? (
                <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-xs inline-block">
                  <img
                    src={qrDataUrl}
                    alt={`Verification QR code for ${certificate.certificateCode}`}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-slate-100 animate-pulse rounded-lg" />
              )}
              <span className="text-[10px] text-slate-500 font-semibold tracking-tight">
                Scan QR to Verify Credential
              </span>
            </div>

            {/* Right: Authorized Issuer Block */}
            <div className="text-center sm:text-right space-y-1">
              <div className="h-10 flex items-end justify-center sm:justify-end pb-1">
                <span className="font-serif italic text-slate-500 text-sm">Inspire Academic Board</span>
              </div>
              <div className="w-36 h-0.5 bg-slate-300 mx-auto sm:ml-auto sm:mr-0" />
              <span className="text-xs font-bold text-[#0F1F5C] block">
                Director of Academics
              </span>
              <span className="text-[10px] text-slate-500 block">
                The Inspire Business Academy
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
