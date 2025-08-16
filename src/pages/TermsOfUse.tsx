import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfUse() {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms of Use</h1>
          <p className="text-slate-600">Last updated: January 2025</p>
        </div>

        <Card className="bg-white/80 backdrop-blur">
          <CardContent className="p-8 prose prose-slate max-w-none">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 mb-6">
              By accessing and using Solosquad ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Description of Service</h2>
            <p className="text-slate-700 mb-6">
              Solosquad is an AI-powered social media management platform that provides automated comment management, content moderation, analytics, and reputation management services across multiple social media platforms.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. User Responsibilities</h2>
            <p className="text-slate-700 mb-4">Users are responsible for:</p>
            <ul className="list-disc pl-6 text-slate-700 mb-6">
              <li>Providing accurate and complete registration information</li>
              <li>Maintaining the security of their account credentials</li>
              <li>Ensuring compliance with all applicable social media platform policies</li>
              <li>Using the service in accordance with all applicable laws and regulations</li>
              <li>Monitoring and reviewing AI-generated responses before they are published</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Service Availability</h2>
            <p className="text-slate-700 mb-6">
              While we strive to maintain 99.9% uptime, Solosquad is provided "as is" and we do not guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue the service at any time with reasonable notice.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Data Privacy and Security</h2>
            <p className="text-slate-700 mb-6">
              We are committed to protecting your privacy and data security. Our data handling practices are detailed in our Privacy Policy. By using our service, you consent to the collection and use of information as outlined in our privacy policy.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Intellectual Property</h2>
            <p className="text-slate-700 mb-6">
              All content, features, and functionality of Solosquad are owned by us and are protected by copyright, trademark, and other intellectual property laws. Users retain ownership of their content but grant us necessary rights to provide the service.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-slate-700 mb-6">
              In no event shall Solosquad be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service. Our total liability is limited to the amount paid for the service in the preceding 12 months.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Termination</h2>
            <p className="text-slate-700 mb-6">
              Either party may terminate this agreement at any time. Upon termination, your right to use the service will cease immediately, and we will delete your data in accordance with our data retention policy.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Changes to Terms</h2>
            <p className="text-slate-700 mb-6">
              We reserve the right to modify these terms at any time. Users will be notified of significant changes via email or through the platform. Continued use of the service constitutes acceptance of the modified terms.
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Contact Information</h2>
            <p className="text-slate-700 mb-6">
              For questions about these Terms of Use, please contact us at:
              <br />
              <a href="mailto:ceo@cyberbeam.ie" className="text-blue-600 hover:text-blue-800">ceo@cyberbeam.ie</a>
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Governing Law</h2>
            <p className="text-slate-700 mb-6">
              These terms shall be governed by and construed in accordance with the laws of Ireland, without regard to its conflict of law provisions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}