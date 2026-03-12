import Layout from "@/components/layout/Layout";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/Privacy")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Layout>
      <div className="bg-secondary py-3">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-primary">Privacy Policy</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-4xl prose prose-sm">
        <p className="text-muted-foreground text-sm mb-6">
          Last updated: February 2026
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          1. Introduction
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Crown Pharmacy is committed to protecting the privacy and security of
          your personal information. This Privacy Policy explains how we
          collect, use, store, and share your personal data in compliance with
          the Zimbabwe Data Protection Act and the Access to Information and
          Protection of Privacy Act (AIPPA).
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          2. Information We Collect
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          We may collect the following types of personal information:
        </p>
        <ul className="text-sm text-muted-foreground mb-4 list-disc pl-6 space-y-1">
          <li>Full name, phone number, email address, and physical address</li>
          <li>
            Prescription information and medical history relevant to dispensing
          </li>
          <li>Purchase history and transaction records</li>
          <li>Uploaded prescription images</li>
          <li>Device and browser information when using our website</li>
        </ul>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          3. How We Use Your Information
        </h2>
        <ul className="text-sm text-muted-foreground mb-4 list-disc pl-6 space-y-1">
          <li>To process and fulfil your orders and deliver products</li>
          <li>
            To verify and dispense prescription medicines in compliance with
            MCAZ regulations
          </li>
          <li>
            To maintain your purchase and medication history for convenient
            reordering
          </li>
          <li>
            To communicate with you regarding orders, prescriptions, and
            promotions
          </li>
          <li>To improve our services and website functionality</li>
          <li>To comply with legal and regulatory obligations</li>
        </ul>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          4. Data Sharing
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          We do not sell or rent your personal information to third parties. We
          may share your data with: registered medical practitioners involved in
          your care; regulatory authorities such as MCAZ as required by law;
          payment service providers (EcoCash, banks) to process transactions;
          delivery partners to fulfil orders. All third parties are required to
          maintain the confidentiality of your data.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          5. Data Security
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          We implement appropriate technical and organisational measures to
          protect your personal data against unauthorised access, alteration,
          disclosure, or destruction. Prescription data is handled with the
          highest level of confidentiality in accordance with pharmaceutical
          ethics and Zimbabwe law.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          6. Data Retention
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          We retain your personal data for as long as necessary to fulfil the
          purposes outlined in this policy, or as required by law. Prescription
          records are retained in accordance with MCAZ requirements (minimum 5
          years). You may request deletion of your account data, subject to our
          legal retention obligations.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          7. Your Rights
        </h2>
        <ul className="text-sm text-muted-foreground mb-4 list-disc pl-6 space-y-1">
          <li>Access your personal data held by us</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data (subject to legal requirements)</li>
          <li>Withdraw consent for marketing communications at any time</li>
          <li>Lodge a complaint with the relevant data protection authority</li>
        </ul>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          8. Cookies
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Our website uses cookies to enhance your browsing experience. Cookies
          help us remember your preferences and shopping basket. You may disable
          cookies in your browser settings, but this may affect website
          functionality.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          9. Changes to This Policy
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          We may update this Privacy Policy from time to time. Any changes will
          be posted on this page with an updated effective date.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          10. Contact Us
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          If you have any questions about this Privacy Policy or your personal
          data, please contact us at any of our branches or email
          fifth@diamondpharmacy.co.zw.
        </p>
      </div>
    </Layout>
  );
}
