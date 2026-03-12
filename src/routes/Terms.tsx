import Layout from "@/components/layout/Layout";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/Terms")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Layout>
      <div className="bg-secondary py-3">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-primary">
            Terms and Conditions
          </h1>
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
          Welcome to Crown Pharmacy. These Terms and Conditions govern your use
          of our website, mobile applications, and the purchase of products from
          any of our branches located in Zimbabwe. By accessing our services,
          you agree to be bound by these terms.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          2. Definitions
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          "Company", "We", "Us" refers to Crown Pharmacy, a registered pharmacy
          operating under the laws of Zimbabwe and licensed by the Medicines
          Control Authority of Zimbabwe (MCAZ). "Customer", "You" refers to any
          individual accessing our services or purchasing products.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          3. Pharmacy Licence & Regulatory Compliance
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Crown Pharmacy is licensed and regulated by the Medicines Control
          Authority of Zimbabwe (MCAZ) and the Pharmacists Council of Zimbabwe.
          All pharmacists employed by Crown Pharmacy are registered with the
          Pharmacists Council of Zimbabwe. We comply with the Medicines and
          Allied Substances Control Act [Chapter 15:03] and all applicable
          regulations.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          4. Products & Services
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          We offer pharmaceutical products, over-the-counter medicines, health
          supplements, beauty products, personal care items, baby products,
          household goods, and electrical appliances. Prescription-controlled
          medicines require a valid prescription from a registered medical
          practitioner in Zimbabwe before dispensing.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          5. Prescription Medicines
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Prescription medicines will only be dispensed upon receipt and
          verification of a valid prescription. Prescriptions can be uploaded
          through our website or presented in person at any branch. We reserve
          the right to refuse to dispense any prescription we deem invalid,
          expired, or suspicious. Prescription-controlled medicines cannot be
          reordered through our online platform without a new valid
          prescription.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          6. Pricing & Payment
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          All prices are displayed in United States Dollars (USD). Prices are
          subject to change without prior notice. We accept payments via
          EcoCash, bank transfer, and cash on delivery/collection. Payment must
          be made in full before or at the time of delivery/collection unless
          otherwise agreed.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          7. Delivery
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          We offer delivery services across Zimbabwe subject to availability.
          Free delivery is available on orders over $50. Delivery times are
          estimates and may vary depending on location and product availability.
          We are not liable for delays caused by factors beyond our control.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          8. Returns & Refunds
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Due to the nature of pharmaceutical products, returns are only
          accepted for damaged, defective, or incorrectly dispensed items.
          Medicines that have been dispensed correctly cannot be returned in
          accordance with MCAZ regulations. Non-pharmaceutical items may be
          returned within 7 days of purchase in their original packaging.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          9. Limitation of Liability
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Crown Pharmacy shall not be liable for any indirect, incidental, or
          consequential damages arising from the use of our products or
          services. Our liability is limited to the purchase price of the
          product in question.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          10. Governing Law
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          These terms shall be governed by and construed in accordance with the
          laws of Zimbabwe. Any disputes arising shall be subject to the
          exclusive jurisdiction of the courts of Zimbabwe.
        </p>

        <h2 className="text-lg font-bold text-foreground mt-6 mb-3">
          11. Contact Information
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          For any queries regarding these terms, please contact us at any of our
          branches or email us at fifth@diamondpharmacy.co.zw.
        </p>
      </div>
    </Layout>
  );
}
