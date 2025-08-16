import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { 
  FacebookIcon, 
  InstagramIcon, 
  MessageCircleIcon, 
  MailIcon, 
  MapPinIcon 
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 lekton-regular">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-white mb-4 lekton-bold">Solosquad</h3>
            <p className="text-slate-400 mb-4 max-w-md">
              An agentic AI assistant for social media and reputation management that scales your team's productivity 
              beyond physical boundaries with intelligent automation and deep insights.
            </p>
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <MailIcon className="w-4 h-4" />
              <a href="mailto:ceo@cyberbeam.ie" className="hover:text-white transition-colors">
                ceo@cyberbeam.ie
              </a>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <MapPinIcon className="w-4 h-4" />
              <span>Dublin, Ireland</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 lekton-bold">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/facebook-posts" className="hover:text-white transition-colors">
                  Social Media
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-white font-semibold mb-4 lekton-bold">Legal & Support</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-use" className="hover:text-white transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link to="/user-deletion-policy" className="hover:text-white transition-colors">
                  Data Deletion
                </Link>
              </li>
              <li>
                <a href="mailto:ceo@cyberbeam.ie" className="hover:text-white transition-colors">
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-slate-700" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-slate-400 text-sm">
            © {currentYear} Solosquad. All rights reserved.
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">Follow us:</span>
            <div className="flex gap-3">
              <a 
                href="#" 
                className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                aria-label="Facebook"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircleIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}