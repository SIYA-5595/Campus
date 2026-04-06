import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GraduationCap, Shield, MapPin, Clock, FileCheck, BarChart3, ChevronRight } from "lucide-react";

const features = [
  { icon: Clock, title: "Smart Attendance", desc: "GPS-verified, time-restricted attendance with geofencing" },
  { icon: MapPin, title: "Campus Geofencing", desc: "200m radius verification using Haversine formula" },
  { icon: FileCheck, title: "Document Portal", desc: "Upload, verify and manage student documents seamlessly" },
  { icon: Shield, title: "Role-Based Access", desc: "Secure access control for students, staff and admins" },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Real-time insights into attendance and performance" },
  { icon: GraduationCap, title: "Academic Hub", desc: "Timetables, marksheets, blogs, events and more" },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass-card border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">My College</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="link" className="text-muted-foreground hidden md:flex" onClick={() => navigate("/login?mode=admin")}>
              Admin Portal
            </Button>
            <ThemeToggle />
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Sign In
            </Button>
            <Button className="gradient-primary text-primary-foreground" onClick={() => navigate("/signup")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Shield className="h-4 w-4" />
              Secure College Management Portal
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
              My College{" "}
              <span className="gradient-text">IT Portal</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              A modern, GPS-verified attendance system with role-based access, document management, 
              and real-time analytics — built for the future of education.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground px-8 h-12 text-base glow-primary"
                onClick={() => navigate("/signup")}
              >
                Get Started <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-8 h-12 text-base"
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
            </div>
          </motion.div>

          {/* Floating gradient orbs */}
          <div className="relative mt-20 max-w-4xl mx-auto">
            <div className="absolute -top-10 -left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
            <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative glass-card rounded-2xl p-8 border border-border/50"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <p className="text-3xl font-display font-bold gradient-text">500+</p>
                  <p className="text-sm text-muted-foreground mt-1">Active Students</p>
                </div>
                <div className="text-center p-4">
                  <p className="text-3xl font-display font-bold gradient-text">98%</p>
                  <p className="text-sm text-muted-foreground mt-1">Attendance Accuracy</p>
                </div>
                <div className="text-center p-4 col-span-2 md:col-span-1">
                  <p className="text-3xl font-display font-bold gradient-text">24/7</p>
                  <p className="text-sm text-muted-foreground mt-1">Portal Access</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A comprehensive platform for managing every aspect of college operations.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <div className="glass-card rounded-xl p-6 h-full hover:glow-primary transition-all duration-300 group">
                  <div className="h-11 w-11 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <f.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © 2026 My College IT Portal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}