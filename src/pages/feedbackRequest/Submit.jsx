import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ArrowLeft, ArrowRight, Upload, FileText, Loader2, Gem, Shield, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadMedia } from '../../services/mediaService';
import { submitFeedbackRequest } from '../../services/scriptFeedbackService';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PRICE_PER_PAGE_CENTS = 50;

function formatUsd(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SubmitFeedbackRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [scriptType, setScriptType] = useState('Screenplay');
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const freeEvalEligible = !!user?.freeEvalEligible;
  const [useFreeEval, setUseFreeEval] = useState(freeEvalEligible);
  const [requireWatermark, setRequireWatermark] = useState(false);
  const [anonymousSubmission, setAnonymousSubmission] = useState(false);

  useEffect(() => {
    if (freeEvalEligible && !file) setUseFreeEval(true);
  }, [freeEvalEligible]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFree = useFreeEval && freeEvalEligible;
  const totalCents = isFree ? 0 : pageCount ? pageCount * PRICE_PER_PAGE_CENTS : 0;

  const handleFileChange = async (e) => {
    setErrorMsg('');
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.type !== 'application/pdf') {
      setErrorMsg('Please upload a PDF file.');
      return;
    }

    if (f.size > 25 * 1024 * 1024) {
      setErrorMsg('PDF must be under 25 MB.');
      return;
    }

    setFile(f);
    setAnalyzing(true);
    setPageCount(null);

    try {
      const buffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(buffer).promise;
      setPageCount(pdf.numPages);
    } catch (err) {
      console.error('PDF parse error', err);
      setErrorMsg('Could not read the PDF. Try a different file.');
      setFile(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a title for your script.');
      return;
    }
    if (!file) {
      setErrorMsg('Please upload a PDF.');
      return;
    }
    if (!pageCount || pageCount < 1) {
      setErrorMsg('Could not determine page count.');
      return;
    }

    setSubmitting(true);
    setProgress(5);

    try {
      const upload = await uploadMedia(user?.id || 'me', file, 'pdf', {
        title: title.trim(),
        description: 'Script for paid feedback',
        privacy: 'private',
        onProgress: (p) => setProgress(Math.max(5, Math.floor(p * 0.7))),
      });

      const scriptUrl = upload?.s3Url || upload?.url;
      const mediaId = upload?.id || upload?.mediaId;
      if (!scriptUrl) {
        throw new Error('Upload did not return a URL');
      }

      setProgress(80);

      const result = await submitFeedbackRequest({
        title: title.trim(),
        scriptType,
        scriptUrl,
        pageCount,
        useFreeEval: isFree,
        mediaId,
        requireWatermark,
        anonymousSubmission,
      });

      setProgress(100);

      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else if (result?.request?.id) {
        navigate(`/feedback-request/${result.request.id}`);
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Could not submit. Please try again.'
      );
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <main className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-2xl mx-auto">

        <Link
          to="/feedback-request"
          className="inline-flex items-center text-sm text-neutral-500 hover:text-[#0CCE6B] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Feedback Request
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Submit a script for feedback</h1>
          <p className="text-sm text-neutral-500">
            Pay <strong className="text-neutral-700">$0.50/page</strong>. A vetted professional reader delivers
            1–4 pages of detailed notes within 72 hours of acceptance.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white border border-neutral-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Script title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The Last Curtain"
                maxLength={200}
                disabled={submitting}
                className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]/30 focus:border-[#0CCE6B] transition-colors disabled:opacity-50"
              />
            </div>

            {/* Script type */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Script type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {['Screenplay', 'Playwright', 'Book'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={submitting}
                    onClick={() => setScriptType(type)}
                    className={`flex-1 py-2.5 border-2 text-sm font-medium transition disabled:opacity-50 ${
                      scriptType === type
                        ? 'border-[#0CCE6B] bg-[#0CCE6B]/8 text-neutral-900'
                        : 'border-neutral-200 text-neutral-500 hover:border-[#0CCE6B]/50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Script PDF <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={submitting}
                className="hidden"
              />
              {!file ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="w-full flex flex-col items-center justify-center py-10 border-2 border-dashed border-neutral-300 hover:border-[#0CCE6B] transition-colors disabled:opacity-50"
                >
                  <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                  <span className="text-sm text-neutral-500">Click to upload</span>
                  <span className="text-xs text-neutral-400 mt-0.5">PDF only · max 25 MB</span>
                </button>
              ) : (
                <div className="flex items-center justify-between border border-neutral-200 p-3">
                  <div className="flex items-center min-w-0">
                    <FileText className="w-5 h-5 text-[#0CCE6B] mr-3 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                      <p className="text-xs text-neutral-500">
                        {analyzing ? 'Counting pages…' : pageCount ? `${pageCount} pages` : ''}
                      </p>
                    </div>
                  </div>
                  {!submitting && (
                    <button
                      type="button"
                      onClick={() => { setFile(null); setPageCount(null); }}
                      className="text-sm text-neutral-400 hover:text-red-500 ml-3 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Options — shown after file selected */}
            {pageCount && (
              <>
                {/* Watermark */}
                <label
                  htmlFor="require-watermark"
                  className="flex items-start gap-3 cursor-pointer bg-neutral-50 border border-neutral-200 p-4 hover:border-[#0CCE6B]/40 transition-colors"
                >
                  <input
                    id="require-watermark"
                    type="checkbox"
                    checked={requireWatermark}
                    onChange={(e) => setRequireWatermark(e.target.checked)}
                    disabled={submitting}
                    className="w-4 h-4 mt-0.5 flex-shrink-0 border-neutral-300 text-[#0CCE6B] focus:ring-[#0CCE6B]"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-neutral-900 inline-flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-neutral-400" />
                      Watermark the PDF before sending to the reader
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Adds your name across each page. Discourages sharing or screenshotting. Reader still gets a fully readable copy.
                    </p>
                  </div>
                </label>

                {/* Anonymous */}
                <label
                  htmlFor="anonymous-submission"
                  className="flex items-start gap-3 cursor-pointer bg-neutral-50 border border-neutral-200 p-4 hover:border-[#0CCE6B]/40 transition-colors"
                >
                  <input
                    id="anonymous-submission"
                    type="checkbox"
                    checked={anonymousSubmission}
                    onChange={(e) => setAnonymousSubmission(e.target.checked)}
                    disabled={submitting}
                    className="w-4 h-4 mt-0.5 flex-shrink-0 border-neutral-300 text-[#0CCE6B] focus:ring-[#0CCE6B]"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-neutral-900 inline-flex items-center gap-1.5">
                      <EyeOff className="w-4 h-4 text-neutral-400" />
                      Submit anonymously
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      The reader will see "Anonymous" instead of your name and profile picture.
                    </p>
                  </div>
                </label>

                {/* Emerald free eval */}
                {freeEvalEligible && (
                  <label
                    htmlFor="use-free-eval"
                    className="flex items-start gap-3 cursor-pointer bg-[#0CCE6B]/8 border-2 border-[#0CCE6B]/40 p-4"
                  >
                    <input
                      id="use-free-eval"
                      type="checkbox"
                      checked={useFreeEval}
                      onChange={(e) => setUseFreeEval(e.target.checked)}
                      className="w-4 h-4 mt-0.5 flex-shrink-0 border-neutral-300 text-[#0CCE6B] focus:ring-[#0CCE6B]"
                    />
                    <div className="text-sm">
                      <p className="font-semibold text-neutral-900 inline-flex items-center gap-1.5">
                        <Gem className="w-4 h-4 text-[#0CCE6B]" />
                        Use my Emerald free evaluation (1/month)
                      </p>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        Skip the payment — included with your Emerald subscription.
                      </p>
                    </div>
                  </label>
                )}

                {/* Price preview */}
                <div className="bg-neutral-50 border border-neutral-200 p-4">
                  {isFree ? (
                    <>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-600">{pageCount} pages · Emerald free eval</span>
                        <span className="font-semibold text-[#0CCE6B]">FREE</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        No payment required. Once Joint approves, your script enters the reader pool.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-600">{pageCount} pages × $0.50</span>
                        <span className="font-semibold text-neutral-900">{formatUsd(totalCents)}</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        You'll be charged via Stripe. If we deny your request, you'll be refunded automatically.
                      </p>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Error */}
            {errorMsg && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}

            {/* Progress */}
            {submitting && (
              <div className="space-y-2">
                <div className="h-1.5 bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-[#0CCE6B] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 text-center">
                  {progress < 80 ? 'Uploading script…' : 'Creating checkout session…'}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || analyzing || !title || !file || !pageCount}
              className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 font-semibold transition-all flex items-center justify-center gap-2 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : isFree ? (
                <>
                  <span>Submit for free Emerald evaluation</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span>Continue to payment{pageCount ? ` — ${formatUsd(totalCents)}` : ''}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

          </form>
        </div>

      </div>
    </main>
  );
}
