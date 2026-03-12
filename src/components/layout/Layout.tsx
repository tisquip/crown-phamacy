import Header from "./Header";
import Footer from "./Footer";
import { PrescriptionOrderAlert } from "@/components/PrescriptionOrderAlert";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <PrescriptionOrderAlert />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
