import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ArrowLeft, Upload, FileText, Loader2 } from 'lucide-react';
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
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const totalCents = pageCount ? pageCount * PRICE_PER_PAGE_CENTS : 0;

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
      if (!scriptUrl) {
        throw new Error('Upload did not return a URL');
      }

      setProgress(80);

      // 2. Create feedback request + Stripe Checkout session
      const { checkoutUrl } = await submitFeedbackRequest({
        title: title.trim(),
        scriptUrl,
        pageCount,
      });

      setProgress(100);

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
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

            {/* Price preview */}
            {pageCount && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
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
