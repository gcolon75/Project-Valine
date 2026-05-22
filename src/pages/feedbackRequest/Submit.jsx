import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ArrowLeft, Upload, FileText, Loader2, Gem, Shield, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui';
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

  // If the user object updates after mount, sync the default
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
      // 1. Upload PDF to S3 via existing media flow
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

      // 2. Create feedback request — free eval skips Stripe, paid flows through Stripe
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
        // Paid path — redirect to Stripe
        window.location.href = result.checkoutUrl;
      } else if (result?.request?.id) {
        // Free eval path — jump straight to the request detail page
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link
          to="/feedback-request"
          className="inline-flex items-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Feedback Request
        </Link>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Submit a script for feedback
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            Pay <strong>$0.50/page</strong>. A vetted professional reader will deliver{' '}
            1–4 pages of detailed notes within 72 hours of acceptance.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
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
                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Script type */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Script type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {['Screenplay', 'Playwright', 'Book'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={submitting}
                    onClick={() => setScriptType(type)}
                    className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                      scriptType === type
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-emerald-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
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
                  className="w-full flex flex-col items-center justify-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-emerald-500 transition"
                >
                  <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Click to upload (PDF, max 25 MB)
                  </span>
                </button>
              ) : (
                <div className="flex items-center justify-between border border-neutral-300 dark:border-neutral-600 rounded-lg p-3">
                  <div className="flex items-center min-w-0">
                    <FileText className="w-6 h-6 text-emerald-600 mr-3 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {analyzing
                          ? 'Counting pages…'
                          : pageCount
                          ? `${pageCount} pages`
                          : ''}
                      </p>
                    </div>
                  </div>
                  {!submitting && (
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPageCount(null);
                      }}
                      className="text-sm text-neutral-500 hover:text-red-500 ml-3"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Watermark toggle */}
            {pageCount && (
              <label
                htmlFor="require-watermark"
                className="flex items-start gap-3 cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:border-emerald-400 transition"
              >
                <input
                  id="require-watermark"
                  type="checkbox"
                  checked={requireWatermark}
                  onChange={(e) => setRequireWatermark(e.target.checked)}
                  disabled={submitting}
                  className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-sm">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 inline-flex items-center gap-1">
                    <Shield className="w-4 h-4 text-neutral-500" />
                    Watermark the PDF before sending to the reader
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                    Adds your name across each page. Discourages sharing or screenshotting. Reader still gets a fully readable copy.
                  </p>
                </div>
              </label>
            )}

            {/* Anonymous submission toggle */}
            {pageCount && (
              <label
                htmlFor="anonymous-submission"
                className="flex items-start gap-3 cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:border-emerald-400 transition"
              >
                <input
                  id="anonymous-submission"
                  type="checkbox"
                  checked={anonymousSubmission}
                  onChange={(e) => setAnonymousSubmission(e.target.checked)}
                  disabled={submitting}
                  className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-sm">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 inline-flex items-center gap-1">
                    <EyeOff className="w-4 h-4 text-neutral-500" />
                    Submit anonymously
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                    The reader will see "Anonymous" instead of your name and profile picture.
                  </p>
                </div>
              </label>
            )}

            {/* Emerald free eval toggle */}
            {freeEvalEligible && pageCount && (
              <label
                htmlFor="use-free-eval"
                className="flex items-start gap-3 cursor-pointer bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-emerald-400 rounded-lg p-4"
              >
                <input
                  id="use-free-eval"
                  type="checkbox"
                  checked={useFreeEval}
                  onChange={(e) => setUseFreeEval(e.target.checked)}
                  className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-sm">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200 inline-flex items-center gap-1">
                    <Gem className="w-4 h-4" />
                    Use my Emerald free evaluation (1/month)
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Skip the payment — included with your Emerald subscription.
                  </p>
                </div>
              </label>
            )}

            {/* Price preview */}
            {pageCount && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                {isFree ? (
                  <>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {pageCount} pages · Emerald free eval
                      </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        FREE
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
                      No payment required. Once Joint approves, your script enters the reader pool.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {pageCount} pages × $0.50
                      </span>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatUsd(totalCents)}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
                      You'll be charged via Stripe. If we deny your request (e.g. spam, off-topic),
                      you'll be refunded automatically.
                    </p>
                  </>
                )}
              </div>
            )}

            {errorMsg && (
              <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
            )}

            {submitting && (
              <div className="space-y-2">
                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center">
                  {progress < 80 ? 'Uploading script…' : 'Creating checkout session…'}
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={submitting || analyzing || !title || !file || !pageCount}
            >
              {submitting ? (
                <span className="inline-flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </span>
              ) : isFree ? (
                'Submit for free Emerald evaluation'
              ) : (
                `Continue to payment — ${formatUsd(totalCents)}`
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
