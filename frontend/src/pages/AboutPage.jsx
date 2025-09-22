import React from "react";

// Lightweight inline icon components (to avoid new dependencies)
const IconHandshake = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 5l-2 2a3 3 0 01-4 0l-1-1a3 3 0 010-4l2-2" />
    <path d="M12 5l2 2a3 3 0 004 0l1-1a3 3 0 000-4l-2-2" />
    <path d="M2 12l4 4a3 3 0 004 0l2-2" />
    <path d="M22 12l-4 4a3 3 0 01-4 0l-2-2" />
  </svg>
);

const IconTarget = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

const IconLightbulb = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M2 11a10 10 0 1120 0c0 3.314-1.791 5.795-4 7-1 1-1 2-1 2H7s0-1-1-2c-2.209-1.205-4-3.686-4-7z" />
  </svg>
);

const IconBookOpen = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 4h8a4 4 0 014 4v12a4 4 0 00-4-4H2z" />
    <path d="M22 4h-8a4 4 0 00-4 4v12a4 4 0 014-4h8z" />
  </svg>
);

const IconUsers = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const IconCalendar = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconNetwork = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
    <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
  </svg>
);

const IconGraduation = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 10l-10-5-10 5 10 5 10-5z" />
    <path d="M6 12v5c3 2 9 2 12 0v-5" />
  </svg>
);

const IconShare = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.59 13.51l6.83 3.98" />
    <path d="M15.41 6.51L8.59 10.49" />
  </svg>
);

const IconBriefcase = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const IconDirectory = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7h5l2 2h11v10a2 2 0 01-2 2H3z" />
  </svg>
);

const Section = ({ children, className = "" }) => (
  <section className={`px-4 sm:px-6 lg:px-8 ${className}`}>{children}</section>
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100 ${className}`}>
    {children}
  </div>
);

const Stat = ({ value, label }) => (
  <div className="text-center">
    <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">{value}</div>
    <div className="mt-1 text-sm text-gray-600">{label}</div>
  </div>
);

const Avatar = ({ name, role }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center text-xl font-bold shadow">
        {initials}
      </div>
      <div className="mt-3 text-base font-semibold text-gray-900">{name}</div>
      <div className="text-sm text-gray-600">{role}</div>
    </div>
  );
};

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-16 sm:gap-20 lg:gap-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50 via-white to-white" />
        <Section className="pt-12 sm:pt-16 lg:pt-20 pb-10 sm:pb-14 lg:pb-16">
          <div className="mx-auto max-w-5xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-medium">
              <IconNetwork className="w-4 h-4" />
              AlumniConnect
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
              About AlumniConnect
            </h1>
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-gray-600 leading-relaxed">
              AlumniConnect bridges students, teachers, and alumni through networking, mentorship, and opportunities for lifelong learning.
            </p>
          </div>
        </Section>
      </div>

      {/* Vision & Mission */}
      <Section>
        <div className="mx-auto max-w-4xl text-center">
          <IconTarget className="w-10 h-10 mx-auto text-indigo-600" />
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Our Vision</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            To build a lifelong community where alumni and students can collaborate, inspire, and achieve together.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><IconHandshake /></div>
              <div>
                <h3 className="font-semibold text-gray-900">We empower connections</h3>
                <p className="mt-1 text-sm text-gray-600">We empower students and alumni to connect meaningfully and grow together.</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><IconUsers /></div>
              <div>
                <h3 className="font-semibold text-gray-900">Mentorship & guidance</h3>
                <p className="mt-1 text-sm text-gray-600">We create opportunities for mentorship, career guidance, and collaboration.</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><IconLightbulb /></div>
              <div>
                <h3 className="font-semibold text-gray-900">Culture of contribution</h3>
                <p className="mt-1 text-sm text-gray-600">We foster a culture of continuous learning and contribution within our community.</p>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* Core Values */}
      <Section>
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Core Values of AlumniConnect</h2>
          <p className="mt-3 text-gray-600">The principles that shape our community.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Connection & Community", desc: "We build strong bonds between alumni, students, and teachers to create a lifelong support network.", Icon: IconNetwork },
            { title: "Collaboration & Knowledge Sharing", desc: "We believe in open discussions, sharing experiences, and learning from one another through forums and mentorship.", Icon: IconShare },
            { title: "Growth & Opportunities", desc: "We provide access to internships, career guidance, and events that empower students and alumni to grow together.", Icon: IconBriefcase },
            { title: "Accessibility & Inclusivity", desc: "We ensure that every student, alumni, and teacher feels welcomed and has equal opportunities to connect, share, and contribute.", Icon: IconUsers },
            { title: "Innovation & Communication", desc: "We use modern technology (chat, events, forums) to make communication seamless, interactive, and impactful.", Icon: IconLightbulb },
            { title: "Mentorship & Guidance", desc: "Alumni and teachers play a vital role in guiding students towards career and personal success.", Icon: IconBookOpen },
          ].map(({ title, desc, Icon }, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-fuchsia-50 text-fuchsia-600"><Icon /></div>
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Our Story */}
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-600 to-fuchsia-600 opacity-10" />
        <Section>
          <Card className="p-8 md:p-10 bg-white">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Our Story</h2>
                <p className="mt-3 text-gray-700 leading-relaxed">
                  AlumniConnect was started with a simple idea: to strengthen the bond between students and alumni. Many students struggle to find mentors and guidance outside the classroom, while alumni often want to give back but lack a platform. AlumniConnect solves this by providing a space where students, teachers, and alumni can connect, collaborate, and create opportunities together.
                </p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="rounded-xl h-28 bg-gradient-to-br from-indigo-500 to-indigo-300 opacity-90" />
                <div className="rounded-xl h-28 bg-gradient-to-br from-fuchsia-500 to-fuchsia-300 opacity-90" />
                <div className="rounded-xl h-28 bg-gradient-to-br from-sky-500 to-sky-300 opacity-90" />
                <div className="rounded-xl h-28 bg-gradient-to-br from-emerald-500 to-emerald-300 opacity-90" />
              </div>
            </div>
          </Card>
        </Section>
      </div>

      {/* Platform Features */}
      <Section>
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Platform Features</h2>
          <p className="mt-3 text-gray-600">A quick snapshot of what you can do on AlumniConnect.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Seamless Networking", desc: "Connect with alumni, students, and teachers to build meaningful professional relationships.", Icon: IconNetwork },
            { title: "Real-time Communication", desc: "Use our in-app chat to interact instantly, share knowledge, and stay connected.", Icon: IconShare },
            { title: "Events & Opportunities", desc: "Stay updated with reunions, workshops, seminars, and alumni-hosted events.", Icon: IconCalendar },
            { title: "Mentorship Programs", desc: "Get guidance from experienced alumni and faculty for career and academic growth.", Icon: IconGraduation },
            { title: "Student Forum", desc: "A dedicated space for questions, advice, and resources about internships and jobs.", Icon: IconBookOpen },
            { title: "Alumni Directory", desc: "Explore and connect with alumni from diverse fields, industries, and career paths.", Icon: IconDirectory },
          ].map(({ title, desc, Icon }, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Icon /></div>
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

     

      {/* Meet the Team */}
      <Section>
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Meet the Team</h2>
          <p className="mt-3 text-gray-600">The people building AlumniConnect.</p>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-6 flex flex-col items-center text-center">
            <Avatar name="Ashish" role="Project Lead" />
          </Card>
          <Card className="p-6 flex flex-col items-center text-center">
            <Avatar name="Kunal" role="Developer" />
          </Card>
          <Card className="p-6 flex flex-col items-center text-center">
            <Avatar name="Prajesh" role="Developer" />
          </Card>
          <Card className="p-6 flex flex-col items-center text-center">
            <Avatar name="Sachin" role="Developer" />
          </Card>
        </div>
      </Section>



      {/* Call to Action */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
        <Section className="py-10 sm:py-12 lg:py-14">
          <div className="mx-auto max-w-4xl text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-bold">Be part of the AlumniConnect family today.</h2>
            <p className="mt-3 text-white/90">Start networking, learning, and growing together.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a href="/signup" className="inline-flex items-center justify-center rounded-lg bg-white text-indigo-700 font-semibold px-4 py-2 shadow hover:shadow-md transition">
                Join Now
              </a>
              <a href="/network" className="inline-flex items-center justify-center rounded-lg border border-white/60 text-white font-semibold px-4 py-2 hover:bg-white/10 transition">
                Explore the Network
              </a>
            </div>
          </div>
        </Section>
      </div>

      <div className="h-4" />
    </div>
  );
}