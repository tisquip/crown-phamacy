import { branches as staticBranches } from "@/data/branches";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import logoSymbol from "@/assets/logo-symbol.png";
import { Link } from "@tanstack/react-router";
import PoweredBy from "../PoweredBy";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Doc } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";

const footerLinks = {
  "Quick Links": [
    { label: "Shop All", href: "/products" },
    { label: "Promotions", href: "/products?promo=true" },
    { label: "Upload Prescription", href: "/prescription" },
    { label: "Our Branches", href: "/Branches" },
  ],
  "Customer Service": [
    { label: "Help", href: "#" },
    { label: "Contact Us", href: "#" },
    { label: "Terms and Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
  "Health Hub": [
    { label: "Conditions", href: "#" },
    { label: "Medicines", href: "#" },
    { label: "Vitamins & Supplements", href: "/products?category=health" },
    { label: "Healthy Living", href: "#" },
  ],
};

const socialLinks = [
  { src: "/twitter.png", alt: "Twitter / X" },
  { src: "/facebook.png", alt: "Facebook" },
  { src: "/instagram.png", alt: "Instagram" },
  { src: "/youtube.png", alt: "YouTube" },
];

const Footer = () => {
  const convex = useConvex();
  const [branches, setBranches] = useState<Doc<"branch">[] | undefined>(
    undefined,
  );
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const subscribe = useMutation(api.userFns.newsletter.subscribe);

  const handleSubscribe = async () => {
    const email = newsletterEmail.trim();
    if (!email) return;
    setSubscribing(true);
    try {
      const result = await subscribe({ email });
      if (result === "subscribed") {
        toast.success("You're subscribed! Thanks for joining.");
        setNewsletterEmail("");
      } else {
        toast.info("This email is already subscribed.");
      }
    } catch {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  useEffect(() => {
    convex.query(api.userFns.branches.list).then((result) => {
      setBranches(result);
      if (result.length === 0) {
        convex
          .mutation(api.userFns.branches.seedIfEmpty, {
            branches: staticBranches.map((b) => ({
              name: b.name,
              address: b.address ?? "",
              city: b.city ?? "",
              cell: b.cell,
              landline: b.landline,
              email: b.email,
              comingSoon: b.comingSoon ?? false,
            })),
          })
          .catch(console.error);
      }
    });
  }, [convex]);

  const displayBranches = branches ?? [];

  return (
    <footer>
      {/* Branch sub-footer */}
      <div id="branches" className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <h3 className="text-xl font-bold text-primary-foreground mb-6 text-center">
            Our Branches
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {displayBranches.map((branch) => (
              <div
                key={branch.name}
                className="bg-primary-foreground/10 backdrop-blur rounded-lg p-4 border border-primary-foreground/20"
              >
                <h4 className="font-bold text-primary-foreground text-sm mb-2">
                  {branch.name}
                </h4>
                {branch.comingSoon ? (
                  <div className="flex items-center gap-2 mt-3">
                    <Clock className="w-4 h-4 text-accent-foreground" />
                    <span className="text-accent-foreground font-semibold text-sm bg-accent/20 px-2 py-0.5 rounded">
                      Coming Soon
                    </span>
                  </div>
                ) : (
                  <ul className="space-y-1.5 text-xs text-primary-foreground/80">
                    <li className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        {branch.address}, {branch.city}
                      </span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{branch.cell}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="break-all">{branch.email}</span>
                    </li>
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="bg-accent text-accent-foreground py-4">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium">
            Don't miss out on savings. Subscribe today!
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter email address"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
              className="px-4 py-2 rounded text-foreground text-sm w-64 focus:outline-none"
            />
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="bg-primary text-primary-foreground px-6 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {subscribing ? "Subscribing…" : "Subscribe"}
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Connect with us:</span>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.alt}
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.alt}
                  className="w-7 h-7 flex items-center justify-center overflow-hidden p-0.5"
                >
                  <img
                    src={social.src}
                    alt={social.alt}
                    className="w-full h-full object-contain"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-bold text-sm mb-3 text-foreground">
                {title}
              </h4>
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-col items-center justify-center">
            <img
              src="/mcs.jpg"
              alt="Crown Pharmacy"
              className="w-full rounded-lg"
            />
            {/* <img
              src={logoSymbol}
              alt="Crown Pharmacy"
              className="w-16 h-16 mb-2 opacity-60"
            />
            <span className="text-primary text-lg italic font-serif">
              your health, our priority
            </span> */}
          </div>
        </div>
      </div>

      {/* Legal */}
      <div className="bg-muted py-4">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
          <p>
            © {new Date().getFullYear()} Crown Pharmacy — All branches licensed
            and registered with MCAZ. <PoweredBy />
          </p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-primary">
              Terms & Conditions
            </Link>
            <Link to="/privacy" className="hover:text-primary">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
