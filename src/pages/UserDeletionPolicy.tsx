import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeftIcon, TrashIcon, ShieldCheckIcon, ClockIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UserDeletionPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-8">
          <Link to="/landing">
            <Button variant="outline" className="mb-6">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">User Data Deletion Policy</h1>
          <p className="text-slate-600">Last updated: January 2025</p>
        </div>

        <Card className="bg-white/80 backdrop-blur">
          <CardContent className="p-8 prose prose-slate max-w-none">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrashIcon className="w-6 h-6 text-red-600" />
              Your Right to Data Deletion
            </h2>
            <p className="text-slate-700 mb-6">
              At Solosquad, we respect your privacy and your right to control your personal data. This policy outlines how you can request deletion of your data and what happens when you do.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">How to Request Data Deletion</h2>
            <p className="text-slate-700 mb-4">You can request deletion of your data through the following methods:</p>
            <ul className="list-disc pl-6 text-slate-700 mb-6">
              <li><strong>Email Request:</strong> Send an email to <a href="mailto:ceo@cyberbeam.ie" className="text-blue-600 hover:text-blue-800">ceo@cyberbeam.ie</a> with the subject "Data Deletion Request"</li>
              <li><strong>Account Settings:</strong> Use the "Delete Account" feature in your account settings (when available)</li>
              <li><strong>Direct Contact:</strong> Contact our support team through the platform's messaging system</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ClockIcon className="w-6 h-6 text-blue-600" />
              Processing Timeline
            </h2>
            <p className="text-slate-700 mb-6">
              We will process your data deletion request within <strong>30 days</strong> of receiving a valid request. You will receive confirmation once the deletion is complete.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">What Data Will Be Deleted</h2>
            <p className="text-slate-700 mb-4">When you request data deletion, we will remove:</p>
            <ul className="list-disc pl-6 text-slate-700 mb-6">
              <li>Your account information and profile data</li>
              <li>Social media account connections and authentication tokens</li>
              <li>AI conversation history and generated responses</li>
              <li>Analytics data and insights specific to your account</li>
              <li>Custom prompts and AI configurations</li>
              <li>Subscription and billing information (subject to legal retention requirements)</li>
              <li>Support tickets and communication history</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Retention Exceptions</h2>
            <p className="text-slate-700 mb-4">Some data may be retained for legal or operational reasons:</p>
            <ul className="list-disc pl-6 text-slate-700 mb-6">
              <li><strong>Legal Compliance:</strong> Financial records may be retained for up to 7 years as required by law</li>
              <li><strong>Security Logs:</strong> Anonymized security logs may be retained for system protection</li>
              <li><strong>Aggregated Analytics:</strong> Anonymized, aggregated data may be retained for service improvement</li>
              <li><strong>Published Content:</strong> Public comments or responses posted through our service may remain on third-party platforms</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="w-6 h-6 text-green-600" />
              Data Security During Deletion
            </h2>
            <p className="text-slate-700 mb-6">
              All data deletion processes follow industry-standard security practices. Data is securely overwritten and cannot be recovered once the deletion process is complete.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Third-Party Data</h2>
            <p className="text-slate-700 mb-6">
              While we can delete data stored in our systems, we cannot delete data that may exist on third-party platforms (such as Facebook, Instagram, etc.) as a result of our service's interactions. You may need to contact these platforms directly to manage data stored in their systems.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Export Before Deletion</h2>
            <p className="text-slate-700 mb-6">
              Before requesting deletion, you may want to export your data. Contact us at <a href="mailto:ceo@cyberbeam.ie" className="text-blue-600 hover:text-blue-800">ceo@cyberbeam.ie</a> to request a copy of your data in a portable format.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Verification Process</h2>
            <p className="text-slate-700 mb-6">
              To protect your privacy and prevent unauthorized deletion requests, we may require identity verification before processing deletion requests. This may include confirming your email address or answering security questions.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Information</h2>
            <p className="text-slate-700 mb-6">
              For data deletion requests or questions about this policy, please contact:
              <br />
              <a href="mailto:ceo@cyberbeam.ie" className="text-blue-600 hover:text-blue-800">ceo@cyberbeam.ie</a>
              <br />
              <span className="text-sm text-slate-500">Please include "Data Deletion Request" in the subject line for faster processing.</span>
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Policy Updates</h2>
            <p className="text-slate-700 mb-6">
              This policy may be updated from time to time. We will notify users of significant changes via email or through the platform. The most current version will always be available on our website.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}