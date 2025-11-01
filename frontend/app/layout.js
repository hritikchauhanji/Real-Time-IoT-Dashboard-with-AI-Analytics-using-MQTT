import "./globals.css";

export const metadata = {
  title: "IoT Dashboard - Real-Time Monitoring",
  description: "Real-time IoT sensor monitoring with AI analytics",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
