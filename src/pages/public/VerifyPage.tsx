import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '../../components/common/SEO';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { CertificateService } from '../../services/certificateService';
import { PublicCertificateVerification } from '../../types';
import {
  Award,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Lock,
  Phone,
  AlertTriangle,
  GraduationCap,
  Calendar,
  XCircle,
} from 'lucide-react';

export const VerifyPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const [searchParams] = useSearchParams();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<PublicCertificateVerification | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Check URL query parameters (e.g. /verify?code=... or /verify?token=...)
  useEffect(() => {
    const queryCode = searchParams.get('code') || searchParams.get('token') || searchParams.get('id');
    if (queryCode && queryCode.trim()) {
      setCode(queryCode.trim());
      executeVerification(queryCode.trim());
    }
  }, [searchParams]);

  const executeVerification = async (identifier: string) => {
    if (!identifier.trim()) return;

    // Rate-limiting check: max 10 failed attempts in the last 60 seconds
    const now = Date.now();
    const recentFailures = failedAttempts.filter((timestamp) => now - timestamp < 60000);
    if (recentFailures.length >= 10) {
      setResult({
        found: false,
        error: isRoman
          ? 'Bohat ziyada nakaam koshishain! Barahe karam 1 minute baad dobara koshish karein.'
          : 'Rate limit exceeded: Too many failed verification attempts. Please wait 1 minute before retrying.',
      });
      setSearched(true);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await CertificateService.verifyCertificatePublic(identifier.trim());
      setResult(res);
      if (!res.found || res.status === 'revoked') {
        setFailedAttempts((prev) => [...prev.filter((t) => now - t < 60000), now]);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setFailedAttempts((prev) => [...prev.filter((t) => now - t < 60000), now]);
      setResult({
        found: false,
        error: err?.message || 'Verification service error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const cleanCode = result?.certificateCode || code.trim();
    const url = `${window.location.origin}/verify?code=${encodeURIComponent(cleanCode)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    executeVerification(code);
  };

  return (
    <div className="w-full">
      <SEO
        title={isRoman ? 'Sanad Ki Tasdeeq - Certificate Verification' : 'Official Certificate Verification - The Inspire Business Academy'}
        description={
          isRoman
            ? 'The Inspire Business Academy ki sanad (certificate) ki online tasdeeq karein. Unique certificate code aur QR token verification.'
            : 'Verify the authenticity of graduation credentials issued by The Inspire Business Academy. Enter certificate code or verification token.'
        }
        canonicalPath="/verify"
      />

      {/* Hero Header */}
      <Section variant="light" spacing="md" className="border-b border-[#1F3FBF]/10">
        <Container size="md">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="accent" size="md">
              <Award className="w-3.5 h-3.5 mr-1" />
              <span>{isRoman ? 'Rasmi Sanad Tasdeeq' : 'Official Credential Verification'}</span>
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-[#0F1F5C] tracking-tight">
              {isRoman ? 'Sanad Ki Tasdeeq' : 'Verify Certificate'}
            </h1>

            <p className="text-sm sm:text-base text-[#0F1F5C]/80 leading-relaxed">
              {isRoman
                ? 'The Inspire Business Academy ki janib se jari karda sanad (certificate) ki asaliyat foran online check karein.'
                : 'Instantly verify the validity and authenticity of credentials awarded by The Inspire Business Academy.'}
            </p>
          </div>
        </Container>
      </Section>

      {/* Verification Card */}
      <Section variant="white" spacing="lg">
        <Container size="md">
          <Card elevated bordered className="p-6 sm:p-10 border-2 border-[#1F3FBF]/20 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#F2F5FF] text-[#1F3FBF] border border-[#1F3FBF]/20 flex items-center justify-center mx-auto mb-4">
              <FileCheck2 className="w-8 h-8" />
            </div>

            <CardHeader className="p-0 text-center pb-6">
              <CardTitle className="text-xl sm:text-2xl text-[#0F1F5C]">
                {isRoman ? 'Certificate Code Darj Karein' : 'Enter Certificate Code or QR Token'}
              </CardTitle>
              <CardDescription>
                {isRoman
                  ? 'Sanad par darj shuda code ya QR token yahan likhein (maslan: INSPIRE-CERT-2026-0001)'
                  : 'Enter the unique certificate serial code or QR verification token (e.g., INSPIRE-CERT-2026-0001)'}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 space-y-6">
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Input
                    placeholder="e.g. INSPIRE-CERT-2026-0001"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="text-center sm:text-left font-mono uppercase font-bold text-sm"
                  />
                  <Button
                    variant="primary"
                    type="submit"
                    size="md"
                    disabled={loading}
                    className="shrink-0 bg-[#1F3FBF] hover:bg-[#0F1F5C]"
                    leftIcon={loading ? <Spinner size="sm" /> : <Search className="w-4 h-4" />}
                  >
                    {isRoman ? 'Tasdeeq Karein' : 'Verify'}
                  </Button>
                </div>
              </form>

              {/* Informational Guidance (No fake/demo codes) */}
              {!searched && (
                <div className="text-center">
                  <p className="text-xs text-slate-500">
                    {isRoman
                      ? 'Sanad par darj rasmi serial code ya QR code scan karke verification token darj karein.'
                      : 'Enter the official serial number printed on your certificate or scan the tamper-proof QR code.'}
                  </p>
                </div>
              )}

              {/* LOADING STATE */}
              {loading && (
                <div className="py-8 text-center space-y-3">
                  <Spinner size="lg" className="text-[#1F3FBF] mx-auto" />
                  <p className="text-sm font-medium text-slate-600">
                    {isRoman ? 'Academy database mein tasdeeq ho rahi hai...' : 'Verifying certificate authenticity against academy registry...'}
                  </p>
                </div>
              )}

              {/* RESULT STATE: VALID */}
              {!loading && searched && result?.found && result.status === 'valid' && (
                <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-500/40 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                          {isRoman ? 'Tasdeeq Shuda Asli Sanad' : 'Authentic & Valid Credential'}
                        </span>
                        <Badge variant="success" size="sm">Valid</Badge>
                      </div>
                      <h3 className="text-lg font-bold text-emerald-950 font-display">
                        {result.recipientName}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-emerald-200/60">
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block mb-1">
                        {isRoman ? 'Shamil Shuda Courses (Certified Programs):' : 'Certified Course(s) Awarded:'}
                      </span>
                      {result.courseTitles && result.courseTitles.length > 1 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {result.courseTitles.map((title, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100/80 text-emerald-950 font-bold rounded-lg border border-emerald-300 text-xs"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {title}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <strong className="text-slate-900 text-sm">{result.courseTitle}</strong>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 block">{isRoman ? 'Sanad Code:' : 'Certificate Code:'}</span>
                      <strong className="text-slate-900 font-mono text-sm">{result.certificateCode}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 block">{isRoman ? 'Program Type:' : 'Track Type:'}</span>
                      <span className="text-slate-800 font-medium">{result.studentType}</span>
                    </div>

                    {result.durationText && (
                      <div>
                        <span className="text-slate-500 block">{isRoman ? 'Muddat (Duration):' : 'Program Duration:'}</span>
                        <strong className="text-slate-900 font-semibold">{result.durationText}</strong>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-500 block">
                        {result.completionDate ? (isRoman ? 'Mukammal Hone Ki Tareekh:' : 'Completion Date:') : isRoman ? 'Jari Karne Ki Tareekh:' : 'Issue Date:'}
                      </span>
                      <span className="text-slate-800 font-medium">
                        {(result.completionDate || result.issueDate)
                          ? new Date(result.completionDate || result.issueDate!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          : 'N/A'}
                      </span>
                    </div>

                    {result.scorePercentage && (
                      <div>
                        <span className="text-slate-500 block">{isRoman ? 'Imtihan Score:' : 'Exam Result:'}</span>
                        <strong className="text-emerald-700 font-bold">{result.scorePercentage}% {result.finalGrade ? `(${result.finalGrade})` : ''}</strong>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {isRoman
                        ? 'Yeh record The Inspire Business Academy ke markazi registry se tasdeeq shuda hai.'
                        : 'This credential record is cryptographically validated and archived in the official academy registry.'}
                    </span>
                  </div>

                  {/* Print / Download PDF and Copy Link Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-2.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handlePrint}
                      leftIcon={<Award className="w-3.5 h-3.5" />}
                      className="bg-emerald-700 hover:bg-emerald-800"
                    >
                      {isRoman ? 'Print / Download PDF' : 'Print / Download PDF'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                    >
                      {copiedLink
                        ? (isRoman ? 'Link Copy Ho Gaya!' : 'Link Copied!')
                        : (isRoman ? 'Tasdeeq Link Copy Karein' : 'Copy Verification Link')}
                    </Button>
                  </div>
                </div>
              )}

              {/* RESULT STATE: REVOKED */}
              {!loading && searched && result?.found && result.status === 'revoked' && (
                <div className="p-6 rounded-2xl bg-rose-50 border-2 border-rose-400 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                          {isRoman ? 'Sanad Mansookh (Revoked)' : 'Certificate Revoked'}
                        </span>
                        <Badge variant="danger" size="sm">Revoked</Badge>
                      </div>
                      <h3 className="text-lg font-bold text-rose-950 font-display">
                        {result.recipientName} — {result.certificateCode}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 bg-white/80 rounded-xl border border-rose-200 text-xs space-y-2">
                    <p className="text-rose-900 font-medium">
                      <strong>{isRoman ? 'Revocation Ki Waja:' : 'Revocation Reason:'}</strong>{' '}
                      {result.revocationReason || 'Revoked by administration.'}
                    </p>
                    {result.revokedAt && (
                      <p className="text-slate-600">
                        {isRoman ? 'Revoke Hone Ki Tareekh:' : 'Date Revoked:'} {new Date(result.revokedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* RESULT STATE: ERROR (System / Database / Network Failure) */}
              {!loading && searched && result?.error && (
                <div className="p-6 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-3 text-center animate-in fade-in-50 duration-200">
                  <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
                  <h4 className="text-base font-bold text-rose-950 font-display">
                    {isRoman ? 'Tasdeeq Service Dastyab Nahi Hai' : 'Verification Service Unavailable'}
                  </h4>
                  <p className="text-xs text-rose-800 leading-relaxed max-w-md mx-auto">
                    {isRoman
                      ? 'Database ya verification service ke sath rabtay mein masla paish aya hai. Certificate ki asaliyat tasdeeq nahi ho saki. Barahe karam thori der baad dobara koshish karein ya academy helpline se rabta karein.'
                      : 'Unable to communicate with the verification database. The certificate validity could not be confirmed. Please try again shortly or contact the academy administration.'}
                  </p>
                </div>
              )}

              {/* RESULT STATE: NOT FOUND (Authoritative database checked, no record found) */}
              {!loading && searched && !result?.error && (!result || !result.found) && (
                <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-3 text-center animate-in fade-in-50 duration-200">
                  <XCircle className="w-10 h-10 text-amber-600 mx-auto" />
                  <h4 className="text-base font-bold text-amber-900 font-display">
                    {isRoman ? 'Koi Record Daryaft Nahi Hua' : 'No Credential Found'}
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed max-w-md mx-auto">
                    {isRoman
                      ? `Code "${code}" ke sath koi sanad registry mein maujood nahi hai. Barahe karam spelling ya code dobara check karein.`
                      : `No issued credential matches "${code}". Please verify the characters and try again or contact administration.`}
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="mt-8 pt-6 border-t border-slate-100 flex-col sm:flex-row text-center sm:text-left justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Anti-Tamper QR Verification Tokens</span>
              </div>

              <a
                href={`https://wa.me/92${siteConfig.whatsapp.replace(/[^0-9]/g, '').slice(1)}?text=${encodeURIComponent(
                  `Assalam o Alaikum! Mujhe The Inspire Business Academy certificate verification ke hawale se rabta karna hai. Code: ${code}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#1F3FBF] hover:underline inline-flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Helpline: {siteConfig.whatsapp}</span>
              </a>
            </CardFooter>
          </Card>
        </Container>
      </Section>
    </div>
  );
};
