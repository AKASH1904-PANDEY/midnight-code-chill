import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  useCreateRsvp,
  useGetRsvpAvailability,
  getGetRsvpAvailabilityQueryKey,
  useGetOrganizerSummary,
  getGetOrganizerSummaryQueryKey,
  useGetOrganizerRsvps,
  getGetOrganizerRsvpsQueryKey,
} from '@workspace/api-client-react';
import { ArrowUpRight, CalendarDays, Check, ChevronRight, Clock3, Code2, Download, ExternalLink, LoaderCircle, MapPin, Moon, Package, QrCode, RefreshCw, Send, Users } from 'lucide-react';
import { Route, Switch, Link, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { buildLaunchKit, captions, downloadCalendar, downloadQr } from '@/lib/launch-kit';
import type { OrganizerRsvp } from '@workspace/api-client-react';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#00F2FE',
    colorForeground: '#EAF2F5',
    colorMutedForeground: '#9AAAB7',
    colorDanger: '#FDA4AF',
    colorBackground: '#101722',
    colorInput: '#0B0F19',
    colorInputForeground: '#EAF2F5',
    colorNeutral: '#354452',
    fontFamily: "'DM Mono', monospace",
    borderRadius: '4px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#101722] rounded-lg w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-slate-100',
    headerSubtitle: 'text-slate-300',
    socialButtonsBlockButtonText: 'text-slate-100',
    formFieldLabel: 'text-slate-200',
    footerActionLink: 'text-cyan-200',
    footerActionText: 'text-slate-300',
    dividerText: 'text-slate-400',
    identityPreviewEditButton: 'text-cyan-200',
    formFieldSuccessText: 'text-emerald-200',
    alertText: 'text-slate-100',
    logoBox: 'mb-2',
    logoImage: 'max-h-10',
    socialButtonsBlockButton: 'border-slate-600 bg-[#0B0F19]',
    formButtonPrimary: 'text-[#0B0F19]',
    formFieldInput: 'border-slate-600 bg-[#0B0F19] text-slate-100',
    footerAction: 'text-slate-300',
    dividerLine: 'bg-slate-600',
    alert: 'border-slate-600 bg-[#0B0F19]',
    otpCodeFieldInput: 'border-slate-600 bg-[#0B0F19] text-slate-100',
    formFieldRow: 'text-slate-100',
    main: 'text-slate-100',
  },
};

function FormatDate({ value }: { value: string }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <>{value}</>;
  return <>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</>;
}

function TopBar() {
  return (
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
      <Link href="/" className="group flex items-center gap-3 text-inherit no-underline" data-testid="link-home">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/[.08] text-[#00F2FE]"><Code2 size={20} /></span>
        <span className="mono text-[11px] font-medium uppercase tracking-[.17em] text-slate-200">Midnight<br className="sm:hidden" /> Code & Chill</span>
      </Link>
      <nav className="flex items-center gap-5 sm:gap-8">
        <a href="/#details" className="mono hidden text-[11px] uppercase tracking-[.12em] text-slate-400 transition hover:text-cyan-200 sm:inline">The session</a>
        <a href="/#rsvp" className="mono text-[11px] uppercase tracking-[.12em] text-slate-400 transition hover:text-cyan-200">RSVP</a>
      </nav>
    </header>
  );
}

function EventPage() {
  const queryClient = useQueryClient();
  const availabilityQuery = useGetRsvpAvailability({ query: { queryKey: getGetRsvpAvailabilityQueryKey(), refetchOnWindowFocus: true } });
  const createRsvp = useCreateRsvp();
  const availability = availabilityQuery.data;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [successName, setSuccessName] = useState('');
  const [formError, setFormError] = useState('');
  const canRegister = Boolean(availability?.registrationOpen && (availability.spotsRemaining > 0));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    createRsvp.mutate({ data: { name: name.trim(), email: email.trim() } }, {
      onSuccess: (confirmation: { id: number; name: string; createdAt: string }) => {
        setSuccessName(confirmation.name);
        setName('');
        setEmail('');
        void queryClient.invalidateQueries({ queryKey: getGetRsvpAvailabilityQueryKey() });
      },
      onError: (error: unknown) => setFormError(error instanceof Error ? error.message : 'That RSVP did not go through. Please try again.'),
    });
  }

  const remaining = availability?.spotsRemaining;
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#0B0F19] text-slate-100">
      <div className="page-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute right-[-12rem] top-24 h-[32rem] w-[32rem] rounded-full bg-cyan-300/[.045] blur-3xl" />
      <TopBar />
      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-24 pt-14 sm:px-8 md:grid-cols-[1.05fr_.95fr] md:pb-32 md:pt-20">
        <div className="fade-up">
          <div className="mono mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[.06] px-3 py-2 text-[10px] uppercase tracking-[.16em] text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00F2FE] shadow-[0_0_12px_#00F2FE]" /> Campus build session / 01
          </div>
          <h1 className="max-w-3xl text-[clamp(3.8rem,9vw,7.7rem)] font-semibold leading-[.89] tracking-[-.075em] text-[#F2F5F8]">
            Stay up.<br /><span className="text-[#00F2FE]">Build</span> something.
          </h1>
          <p className="mt-8 max-w-lg text-lg leading-8 text-slate-400">A focused, welcoming midnight session for people who build things—and want good company while they do it.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#rsvp" className="mono inline-flex items-center gap-3 rounded-md bg-[#00F2FE] px-5 py-4 text-xs font-medium uppercase tracking-[.1em] text-[#0B0F19] transition hover:-translate-y-0.5 hover:bg-[#79fbff]" data-testid="link-hero-rsvp">Save your spot <ArrowUpRight size={16} /></a>
            <button type="button" onClick={() => downloadCalendar()} className="mono inline-flex items-center gap-2 border border-slate-700 px-4 py-4 text-xs uppercase tracking-[.1em] text-slate-300 transition hover:border-cyan-200/50 hover:text-cyan-200" data-testid="button-public-calendar"><CalendarDays size={14} /> Add to calendar</button>
            <span className="mono inline-flex items-center gap-2 px-2 text-xs text-slate-500"><Users size={15} /> {availabilityQuery.isLoading ? 'Checking seats…' : availability ? `${remaining} of ${availability.capacity} seats open` : 'Availability unavailable'}</span>
          </div>
          <div className="mt-14 grid max-w-xl grid-cols-3 border-y border-slate-700/60 py-5">
            <div><p className="mono text-[10px] uppercase tracking-[.15em] text-slate-500">When</p><p className="mt-2 text-sm text-slate-200">Fri, Nov 20</p></div>
            <div className="border-l border-slate-700/60 pl-4 sm:pl-6"><p className="mono text-[10px] uppercase tracking-[.15em] text-slate-500">Time</p><p className="mt-2 text-sm text-slate-200">9 PM — 1 AM</p></div>
            <div className="border-l border-slate-700/60 pl-4 sm:pl-6"><p className="mono text-[10px] uppercase tracking-[.15em] text-slate-500">Where</p><p className="mt-2 text-sm text-slate-200">Innovation Lab</p></div>
          </div>
        </div>
        <div className="fade-up delay-1 relative mx-auto w-full max-w-[34rem]">
          <div className="absolute -inset-4 rotate-[-2deg] border border-cyan-300/15" />
          <div className="relative aspect-[.94] overflow-hidden border border-slate-700/70 bg-[#101a28] p-5 sm:p-8">
            <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 76% 28%,rgba(0,242,254,.14),transparent 29%),linear-gradient(135deg,transparent 45%,rgba(0,242,254,.06) 45.2%,transparent 45.5%),linear-gradient(45deg,transparent 60%,rgba(133,168,188,.06) 60.2%,transparent 60.5%)' }} />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex justify-between"><span className="mono text-[10px] uppercase tracking-[.16em] text-cyan-200">[ after hours ]</span><Moon size={18} className="text-cyan-200" /></div>
              <div className="relative mx-auto flex aspect-square w-[75%] items-center justify-center">
                <div className="absolute inset-[5%] rounded-full border border-cyan-200/10" />
                <div className="absolute inset-[16%] rounded-full border border-cyan-200/15" />
                <div className="absolute inset-[28%] rounded-full border border-cyan-200/20" />
                <div className="absolute h-[1px] w-full bg-cyan-300/30" />
                <div className="absolute h-full w-[1px] bg-cyan-300/30" />
                <div className="relative z-10 flex h-[42%] w-[42%] items-center justify-center border border-cyan-200/40 bg-[#0B0F19] shadow-[0_0_60px_rgba(0,242,254,.14)]"><span className="mono text-center text-xs leading-6 text-[#00F2FE]">while<br />(awake) {'{'}<br />build();<br />{'}'}</span></div>
              </div>
              <div className="flex items-end justify-between"><p className="text-3xl font-semibold tracking-[-.06em] sm:text-4xl">Make room<br />for the idea.</p><span className="mono text-right text-[10px] leading-5 text-slate-500">20 NOV<br />2026 / IST</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="details" className="relative border-y border-slate-700/50 bg-[#0e1420]/80">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[.75fr_1.25fr] md:py-24">
          <div><p className="mono text-[10px] uppercase tracking-[.18em] text-cyan-200">A different kind of night</p><h2 className="mt-4 max-w-md text-4xl font-medium leading-tight tracking-[-.055em]">Bring a project.<br />Leave with momentum.</h2></div>
          <div className="grid gap-8 sm:grid-cols-2">
            <Detail icon={<Code2 size={18} />} label="Build in good company" text="Bring the side project, the half-finished prototype, or the idea still living in your notes. Work alongside people who get it." />
            <Detail icon={<Users size={18} />} label="Share what you know" text="Pair up, trade perspectives, ask the question you have been stuck on. No stage, no pressure—just builders helping builders." />
             <Detail icon={<Clock3 size={18} />} label="The late shift" text="Four late-night hours, from 9 in the evening until 1 AM. Come ready to make progress." />
             <Detail icon={<MapPin size={18} />} label="On campus" text="Innovation Lab, Block 3. Settle in for a night of coding and late-night snacks." />
          </div>
        </div>
      </section>

      <section id="rsvp" className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 md:grid-cols-[1fr_.8fr] md:py-28">
        <div className="fade-up">
          <p className="mono text-[10px] uppercase tracking-[.18em] text-cyan-200">Registration / 45 seats total</p>
          <h2 className="mt-4 max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-.065em] sm:text-6xl">Your desk is<br />waiting.</h2>
          <p className="mt-6 max-w-md leading-7 text-slate-400">A small room makes better conversations. RSVP now; registrations close November 19.</p>
          <Availability availability={availability} loading={availabilityQuery.isLoading} error={availabilityQuery.isError} onRetry={() => void availabilityQuery.refetch()} />
          <div className="mt-8 flex gap-3 text-sm text-slate-400"><CalendarDays size={17} className="mt-0.5 shrink-0 text-cyan-200" /><span>Friday, November 20, 2026<br /><span className="text-slate-500">9:00 PM–1:00 AM · Asia/Kolkata</span></span></div>
          <div className="mt-4 flex gap-3 text-sm text-slate-400"><MapPin size={17} className="mt-0.5 shrink-0 text-cyan-200" /><span>Innovation Lab, Block 3<br /><span className="text-slate-500">On Campus</span></span></div>
        </div>
        <div className="fade-up delay-1 border border-slate-700/70 bg-[#101722] p-6 sm:p-8">
          {successName ? (
            <div className="flex min-h-[19rem] flex-col justify-center" role="status" data-testid="status-rsvp-success">
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-emerald-200"><Check size={23} /></span>
              <p className="mono text-[10px] uppercase tracking-[.17em] text-emerald-200">You are on the list</p>
              <h3 className="mt-3 text-3xl font-medium tracking-[-.04em]">See you after dark, {successName}.</h3>
              <p className="mt-3 leading-6 text-slate-400">Your registration is confirmed. Save the date: Friday, November 20.</p>
              <button onClick={() => setSuccessName('')} className="mono mt-7 flex w-fit items-center gap-2 text-xs uppercase tracking-[.1em] text-cyan-200" data-testid="button-rsvp-another">Register another person <ChevronRight size={14} /></button>
            </div>
          ) : (
            <>
              <div className="mb-7 flex items-start justify-between gap-4"><div><p className="mono text-[10px] uppercase tracking-[.15em] text-cyan-200">Claim a place</p><h3 className="mt-2 text-2xl font-medium tracking-[-.04em]">One quick RSVP.</h3></div><span className="mono border border-slate-700 px-2 py-1 text-[10px] text-slate-500">45 SEATS / ON CAMPUS</span></div>
              <form onSubmit={submit} className="space-y-5">
                <label className="block"><span className="mono mb-2 block text-[10px] uppercase tracking-[.12em] text-slate-400">Your name</span><input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name you go by" className="w-full border border-slate-700 bg-[#0B0F19] px-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-300" data-testid="input-rsvp-name" /></label>
                <label className="block"><span className="mono mb-2 block text-[10px] uppercase tracking-[.12em] text-slate-400">Email address</span><input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@campus.edu" className="w-full border border-slate-700 bg-[#0B0F19] px-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-300" data-testid="input-rsvp-email" /></label>
                {formError && <p className="border border-red-300/20 bg-red-300/[.06] px-3 py-2.5 text-sm text-red-200" role="alert" data-testid="status-rsvp-error">{formError}</p>}
                {!availabilityQuery.isLoading && availability && !canRegister && <p className="text-sm text-amber-200" role="status">Registration is closed or all places have been claimed.</p>}
                <button type="submit" disabled={!canRegister || createRsvp.isPending} className="mono flex w-full items-center justify-center gap-3 bg-[#00F2FE] px-5 py-4 text-xs font-medium uppercase tracking-[.12em] text-[#0B0F19] transition hover:bg-[#77faff] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-submit-rsvp">{createRsvp.isPending ? <><LoaderCircle size={15} className="animate-spin" /> Saving your place…</> : <>Confirm my RSVP <Send size={14} /></>}</button>
                <p className="text-center text-xs leading-5 text-slate-500">Your details are only used to manage this event. Attendee information is never public.</p>
              </form>
            </>
          )}
        </div>
      </section>
      <footer className="border-t border-slate-800 px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center"><p className="mono text-[10px] uppercase tracking-[.13em] text-slate-500">Made for the ones still building.</p><a href="mailto:contact@akashpandey.dev" className="mono flex items-center gap-2 text-[11px] text-slate-500 transition hover:text-cyan-200">Hosted by Akash Pandey <ExternalLink size={12} /></a></div></footer>
    </main>
  );
}

function Detail({ icon, label, text }: { icon: ReactNode; label: string; text: string }) {
  return <article className="border-l border-cyan-300/30 pl-5"><span className="text-cyan-200">{icon}</span><h3 className="mt-3 font-medium text-slate-100">{label}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></article>;
}

function Availability({ availability, loading, error, onRetry }: { availability?: { capacity: number; registered: number; spotsRemaining: number; registrationOpen: boolean; deadline: string }; loading: boolean; error: boolean; onRetry: () => void }) {
  if (loading) return <div className="mt-8 h-16 animate-pulse border-y border-slate-700/60 bg-slate-800/20" aria-label="Loading availability" />;
  if (error || !availability) return <div className="mt-8 flex items-center justify-between border-y border-slate-700/60 py-4 text-sm text-slate-400" role="alert"><span>Could not load live availability.</span><button onClick={onRetry} className="mono flex items-center gap-2 text-xs text-cyan-200" data-testid="button-retry-availability"><RefreshCw size={13} /> Retry</button></div>;
  const percent = Math.min(100, Math.max(0, (availability.registered / availability.capacity) * 100));
  return <div className="mt-8 border-y border-slate-700/60 py-4" data-testid="status-live-availability"><div className="mb-3 flex items-end justify-between"><span className="mono text-xs text-slate-300">{availability.spotsRemaining} spots remaining</span><span className="mono text-[10px] text-slate-500">{availability.registered} / {availability.capacity} reserved</span></div><div className="h-1.5 overflow-hidden bg-slate-800"><div className="h-full bg-[#00F2FE] transition-[width] duration-500" style={{ width: `${percent}%` }} /></div><p className="mono mt-3 text-[10px] text-slate-500">RSVP closes <FormatDate value={availability.deadline} /></p></div>;
}

function OrganizerPage() {
  if (!clerkPubKey) return <main className="min-h-[100dvh] bg-[#0B0F19] px-5 py-16 text-slate-100"><div className="mx-auto max-w-lg border border-amber-200/20 bg-[#101722] p-8"><p className="mono text-[10px] uppercase tracking-[.15em] text-amber-200">Organizer sign-in unavailable</p><h1 className="mt-3 text-3xl font-medium tracking-[-.04em]">Clerk is not configured.</h1><p className="mt-3 text-sm leading-6 text-slate-400">Add the Clerk publishable key to enable organizer access.</p><Link href="/" className="mono mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[.1em] text-cyan-200">Back to event <ChevronRight size={14} /></Link></div></main>;
  return <OrganizerDashboard />;
}

function OrganizerDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const summaryQuery = useGetOrganizerSummary({ query: { queryKey: getGetOrganizerSummaryQueryKey(), enabled: isLoaded && Boolean(isSignedIn), retry: false } });
  const rsvpsQuery = useGetOrganizerRsvps({ query: { queryKey: getGetOrganizerRsvpsQueryKey(), enabled: isLoaded && Boolean(isSignedIn), retry: false } });
  const [actionState, setActionState] = useState('');
  const [queryText, setQueryText] = useState('');
  const summary = summaryQuery.data;
  const attendees: OrganizerRsvp[] = rsvpsQuery.data ?? [];
  const filtered = useMemo(() => attendees.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(queryText.toLowerCase())), [attendees, queryText]);

  if (!isLoaded) return <main className="min-h-[100dvh] bg-[#0B0F19] p-8"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-8 w-56 bg-slate-800" /><div className="mt-10 h-40 bg-slate-800/60" /></div></main>;
  if (!isSignedIn) {
    return <Redirect to="/sign-in?redirect_url=%2Forganizer" />;
  }

  const startKit = async () => {
    setActionState('Preparing your launch kit…');
    try { await buildLaunchKit(window.location.origin); setActionState('Launch kit downloaded.'); }
    catch (error) { setActionState(error instanceof Error ? error.message : 'Could not build the ZIP. Try again.'); }
  };
  const eventProps = { rootUrl: window.location.origin };
  const downloadGraphic = async (key: 'feed' | 'story' | 'banner' | 'square') => {
    setActionState('Preparing graphic…');
    try { await buildLaunchKit(eventProps.rootUrl, key); setActionState('Graphic downloaded.'); }
    catch (error) { setActionState(error instanceof Error ? error.message : 'Could not generate the graphic.'); }
  };

  return <main className="min-h-[100dvh] bg-[#0B0F19] text-slate-100">
    <header className="border-b border-slate-800"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Link href="/" className="mono flex items-center gap-3 text-xs uppercase tracking-[.12em] text-slate-200"><Code2 size={17} className="text-cyan-200" /> Midnight Code & Chill</Link><div className="flex items-center gap-5"><span className="mono hidden text-[10px] uppercase tracking-[.13em] text-slate-500 sm:inline">Private organizer space</span><button onClick={() => window.location.assign('/')} className="mono text-[10px] uppercase tracking-[.12em] text-slate-400 hover:text-cyan-200" data-testid="button-organizer-home">Public event</button></div></div></header>
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-cyan-200">Organizer console / private</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">The room, at a glance.</h1><p className="mt-3 text-sm text-slate-400">Attendee details are visible only to signed-in organizers.</p></div><span className="mono flex items-center gap-2 text-xs text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Authenticated session</span></div>
      {summaryQuery.isLoading || rsvpsQuery.isLoading ? <div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse bg-slate-800/50" /><div className="h-32 animate-pulse bg-slate-800/50" /><div className="h-32 animate-pulse bg-slate-800/50" /></div> : summaryQuery.isError || rsvpsQuery.isError ? <div className="flex flex-col items-start gap-3 border border-red-300/20 bg-red-300/[.04] p-6" role="alert"><p className="text-sm text-red-100">Could not load organizer data. Your session may not have access to this event.</p><button onClick={() => { void summaryQuery.refetch(); void rsvpsQuery.refetch(); }} className="mono flex items-center gap-2 text-xs text-cyan-200" data-testid="button-organizer-retry"><RefreshCw size={14} /> Try again</button></div> : <>
        <section className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="border border-cyan-300/25 bg-[#101a27] p-6 md:row-span-2 md:p-8"><p className="mono text-[10px] uppercase tracking-[.16em] text-cyan-200">Registration pulse</p><div className="mt-8 flex items-end gap-3"><span className="text-7xl font-semibold leading-none tracking-[-.08em]">{summary?.registered ?? 0}</span><span className="mono pb-2 text-xs text-slate-500">/ {summary?.capacity ?? 0} registered</span></div><div className="mt-6 h-2 bg-slate-800"><div className="h-full bg-[#00F2FE]" style={{ width: `${summary?.capacity ? Math.min(100, (summary.registered / summary.capacity) * 100) : 0}%` }} /></div><p className="mono mt-3 text-[10px] text-slate-500">{summary?.spotsRemaining ?? 0} spots left · {summary?.registrationOpen ? 'Registration open' : 'Registration closed'}</p><div className="mt-9 border-t border-slate-700/70 pt-5"><p className="text-lg font-medium">{summary?.eventName ?? 'Midnight Code & Chill'}</p><p className="mono mt-2 text-[10px] uppercase tracking-[.12em] text-slate-500">Friday / November 20 / 9 PM–1 AM</p></div></div>
          <Metric label="Available seats" value={summary?.spotsRemaining ?? 0} detail={`Capacity ${summary?.capacity ?? 0}`} />
          <Metric label="RSVP deadline" value={summary?.deadline ? new Date(summary.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '—'} detail="November 19, 2026" />
          <div className="border border-slate-800 bg-[#0e1420] p-5 md:col-span-2"><div className="flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-[.14em] text-slate-500">Registration status</p><p className="mt-2 text-sm text-slate-200">{summary?.registrationOpen ? 'Accepting registrations' : 'Not accepting registrations'}</p></div><span className={`mono border px-3 py-2 text-[10px] uppercase tracking-[.1em] ${summary?.registrationOpen ? 'border-emerald-300/25 bg-emerald-300/[.06] text-emerald-200' : 'border-amber-300/25 text-amber-200'}`}>{summary?.registrationOpen ? 'Open' : 'Closed'}</span></div></div>
        </section>
        <section className="mt-12" aria-labelledby="attendees-heading">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mono text-[10px] uppercase tracking-[.16em] text-slate-500">Private roster</p><h2 id="attendees-heading" className="mt-2 text-2xl font-medium tracking-[-.04em]">Attendees <span className="mono text-sm text-slate-500">({attendees.length})</span></h2></div><input type="search" value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Find an attendee…" className="w-full border border-slate-700 bg-[#101722] px-4 py-3 text-sm sm:w-64" aria-label="Search attendees" data-testid="input-search-attendees" /></div>
          {attendees.length === 0 ? <div className="border border-dashed border-slate-700 px-6 py-12 text-center"><Users className="mx-auto text-slate-600" size={23} /><p className="mt-4 text-sm text-slate-300">No registrations yet.</p><p className="mt-1 text-xs text-slate-500">When people RSVP, their details will appear here.</p></div> : filtered.length === 0 ? <div className="border border-slate-800 p-8 text-center text-sm text-slate-500">No attendees match “{queryText}”.</div> : <div className="overflow-x-auto border border-slate-800"><table className="w-full min-w-[600px] text-left"><thead className="bg-[#101722]"><tr className="mono text-[10px] uppercase tracking-[.13em] text-slate-500"><th className="px-5 py-4 font-normal">Attendee</th><th className="px-5 py-4 font-normal">Email</th><th className="px-5 py-4 font-normal">Registered</th></tr></thead><tbody>{filtered.map((r) => <tr key={r.id} className="border-t border-slate-800 text-sm" data-testid={`row-attendee-${r.id}`}><td className="px-5 py-4 text-slate-200">{r.name}</td><td className="px-5 py-4 text-slate-400">{r.email}</td><td className="mono px-5 py-4 text-xs text-slate-500">{new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="mt-14 border border-slate-800 bg-[#0e1420] p-6 sm:p-8" aria-labelledby="launch-kit-heading">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start"><div><p className="mono text-[10px] uppercase tracking-[.16em] text-cyan-200">Browser-made assets / no social posting</p><h2 id="launch-kit-heading" className="mt-2 text-2xl font-medium tracking-[-.04em]">Launch kit</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Download ready-to-share graphics, a calendar invite, and a QR code for the published event page. Everything is generated locally in your browser.</p></div><button onClick={startKit} className="mono inline-flex shrink-0 items-center justify-center gap-2 bg-[#00F2FE] px-5 py-3.5 text-[10px] font-medium uppercase tracking-[.12em] text-[#0B0F19] hover:bg-[#77faff]" data-testid="button-download-launch-kit"><Package size={15} /> Download full ZIP</button></div>
          {actionState && <p role="status" className="mono mt-4 text-xs text-cyan-200" data-testid="status-launch-kit">{actionState}</p>}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KitAction icon={<QrCode size={17} />} title="Live QR code" detail="PNG · published root" onClick={async () => { setActionState('Generating QR code…'); try { await downloadQr(eventProps.rootUrl); setActionState('QR code downloaded.'); } catch (e) { setActionState(e instanceof Error ? e.message : 'Could not generate QR code.'); } }} testId="button-download-qr" />
            <KitAction icon={<CalendarDays size={17} />} title="Calendar invite" detail="ICS · Asia/Kolkata" onClick={() => { downloadCalendar(); setActionState('Calendar invite downloaded.'); }} testId="button-download-ics" />
            <KitAction icon={<Download size={17} />} title="Feed graphic" detail="SVG · 1080 × 1350" onClick={() => void downloadGraphic('feed')} testId="button-download-feed" />
            <KitAction icon={<Download size={17} />} title="Story graphic" detail="SVG · 1080 × 1920" onClick={() => void downloadGraphic('story')} testId="button-download-story" />
            <KitAction icon={<Download size={17} />} title="Social banner" detail="SVG · 1500 × 500" onClick={() => void downloadGraphic('banner')} testId="button-download-banner" />
            <KitAction icon={<Download size={17} />} title="Square graphic" detail="SVG · 1080 × 1080" onClick={() => void downloadGraphic('square')} testId="button-download-square" />
            <div className="border border-slate-800 bg-[#101722] p-4 sm:col-span-2"><p className="mono text-[10px] uppercase tracking-[.12em] text-slate-500">Copy-ready captions</p><div className="mt-3 space-y-4">{captions.map((caption, index) => <div key={caption} className={index ? 'border-t border-slate-800 pt-3' : ''}><p className="text-xs leading-5 text-slate-300">{caption}</p><button onClick={async () => { try { await navigator.clipboard.writeText(caption); setActionState(`Caption ${index + 1} copied to clipboard.`); } catch { setActionState('Clipboard access unavailable. Select and copy the caption manually.'); } }} className="mono mt-2 text-[10px] uppercase tracking-[.1em] text-cyan-200 hover:text-white" data-testid={`button-copy-caption-${index + 1}`}>Copy caption {index + 1}</button></div>)}</div></div>
          </div>
        </section>
      </>}
      <footer className="mt-16 border-t border-slate-800 pt-6"><p className="mono text-[10px] uppercase tracking-[.12em] text-slate-600">Midnight Code & Chill / organizer access only</p></footer>
    </div>
  </main>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="border border-slate-800 bg-[#0e1420] p-5"><p className="mono text-[10px] uppercase tracking-[.13em] text-slate-500">{label}</p><p className="mt-5 text-3xl font-medium tracking-[-.05em] text-slate-100">{value}</p><p className="mono mt-1 text-[10px] text-slate-500">{detail}</p></div>;
}

function KitAction({ icon, title, detail, onClick, testId }: { icon: ReactNode; title: string; detail: string; onClick: () => void; testId: string }) {
  return <button onClick={onClick} className="group flex min-h-[82px] items-center gap-3 border border-slate-800 bg-[#101722] p-4 text-left transition hover:border-cyan-300/40" data-testid={testId}><span className="text-cyan-200">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm text-slate-200">{title}</span><span className="mono mt-1 block text-[9px] uppercase tracking-[.1em] text-slate-500">{detail}</span></span><ArrowUpRight size={14} className="text-slate-600 transition group-hover:text-cyan-200" /></button>;
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return <main className="page-grid flex min-h-[100dvh] items-center justify-center bg-[#0B0F19] px-5 py-14 text-slate-100">
    <div className="w-full max-w-md"><Link href="/" className="mono mb-9 flex items-center gap-3 text-[11px] uppercase tracking-[.13em] text-slate-300"><Code2 className="text-cyan-200" size={18} /> Midnight Code & Chill</Link>
      <div className="border border-slate-700/80 bg-[#101722] p-6 sm:p-9">
        <p className="mono text-[10px] uppercase tracking-[.17em] text-cyan-200">Organizer access</p><h1 className="mt-3 text-3xl font-medium tracking-[-.05em]">{mode === 'sign-in' ? 'Welcome back.' : 'Create your account.'}</h1><p className="mb-7 mt-2 text-sm text-slate-400">Sign in to view the private attendee roster.</p>
        {clerkPubKey ? mode === 'sign-in' ? <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} appearance={clerkAppearance} /> : <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} appearance={clerkAppearance} /> : <div className="border border-amber-200/20 bg-amber-200/[.05] p-4 text-sm leading-6 text-amber-100" role="alert">Clerk is not configured for this deployment. Add the publishable key to enable organizer sign-in.</div>}
        <p className="mono mt-7 text-center text-[10px] text-slate-500">{mode === 'sign-in' ? 'New organizer?' : 'Already registered?'} <Link href={mode === 'sign-in' ? '/sign-up' : '/sign-in'} className="text-cyan-200 hover:text-white">{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</Link></p>
      </div>
    </div>
  </main>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={EventPage} />
    <Route path="/organizer" component={OrganizerPage} />
    <Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} />
    <Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const currentUserId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== currentUserId) {
        queryClient.clear();
      }
      previousUserId.current = currentUserId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function ClerkShell() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Organizer sign in', subtitle: 'Sign in to view private event registrations.' } },
      signUp: { start: { title: 'Organizer account', subtitle: 'Use the approved organizer email for dashboard access.' } },
    }}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
  >
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator />
      <TooltipProvider><Router /><Toaster /></TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  return <WouterRouter base={basePath}>
    {clerkPubKey
      ? <ClerkShell />
      : <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>}
  </WouterRouter>;
}

export default App;
