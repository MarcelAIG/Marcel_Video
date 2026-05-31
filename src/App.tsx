import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronDown } from 'lucide-react';
import Hls from 'hls.js';

const NAV_LINKS = ['Home', 'About', 'Solutions', 'FAQ', 'Contact', 'Infrastructure'];
const VIDEO_SRC = 'https://res.cloudinary.com/dn1ejg82q/video/upload/v1/green-digital-dna-helix-with-binary-code-stream-ba-2026-01-28-03-25-11-utc_ljevwg.mp4';
const HERO_VIDEO_SRC = 'https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8';

export default function App() {
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoBgRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const heroVideoRef = useRef<HTMLDivElement>(null);
  const heroVideoElementRef = useRef<HTMLVideoElement>(null);
  const [framesReady, setFramesReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const framesRef = useRef<HTMLCanvasElement[]>([]);

  // Parallax tracking
  useEffect(() => {
    // HLS for Hero Video
    if (heroVideoElementRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls({ startLevel: 2 });
        hls.loadSource(HERO_VIDEO_SRC);
        hls.attachMedia(heroVideoElementRef.current);
      } else if (heroVideoElementRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        heroVideoElementRef.current.src = HERO_VIDEO_SRC;
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!videoBgRef.current) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const targetX = ((e.clientX - cx) / cx) * 20;
      const targetY = ((e.clientY - cy) / cy) * 20;
      
      gsap.to(videoBgRef.current, {
        x: targetX,
        y: targetY,
        duration: 0.5,
        ease: 'power2.out'
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Frame capture loop
  useEffect(() => {
    setMounted(true);
    let capturing = true;
    let lastTime = -1;
    const MAX_WIDTH = 960;
    const frames: HTMLCanvasElement[] = [];

    const captureFrame = () => {
      if (!capturing || !videoRef.current) return;
      const video = videoRef.current;
      
      if (video.readyState >= 2 && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth) || 1;
        const w = (video.videoWidth * scale) || 960;
        const h = (video.videoHeight * scale) || 540;
        
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          frames.push(canvas);

          // Draw first frame immediately
          if (frames.length === 1 && displayCanvasRef.current) {
            const cvs = displayCanvasRef.current;
            cvs.width = w;
            cvs.height = h;
            const dCtx = cvs.getContext('2d');
            if (dCtx) {
              dCtx.drawImage(canvas, 0, 0);
            }
          }
          if (Number.isFinite(video.duration) && video.duration > 0) {
            const progress = Math.min(100, Math.floor((video.currentTime / video.duration) * 100));
            setLoadingProgress(progress);
          }
        }
      }
      
      if (capturing) {
        if ('requestVideoFrameCallback' in video) {
          (video as any).requestVideoFrameCallback(captureFrame);
        } else {
          requestAnimationFrame(captureFrame);
        }
      }
    };

    const handleLoadedMetadata = () => {
      if (!videoRef.current) return;
      videoRef.current.playbackRate = 3.0; // Play faster to reduce loading time
      videoRef.current.play().catch(() => {});
      captureFrame();
    };

    const handleEnded = () => {
      capturing = false;
      framesRef.current = frames;
      setLoadingProgress(100);
      setFramesReady(true);
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('ended', handleEnded);
      if (video.readyState >= 1) handleLoadedMetadata();
    }

    return () => {
      capturing = false;
      if (video) {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('ended', handleEnded);
      }
    };
  }, []);

  // Direct, continuous mapping from scroll position to video frame.
  useEffect(() => {
    const handleHeroFade = () => {
      if (heroVideoRef.current) {
        const scrollY = window.scrollY;
        const vh = window.innerHeight;
        // Fade out between 0 and 90vh
        const opacity = Math.max(0, 1 - (scrollY / (vh * 0.9)));
        heroVideoRef.current.style.opacity = opacity.toString();
        // Move slightly to create a parallax effect as it fades
        const yOffset = scrollY * 0.3;
        heroVideoRef.current.style.transform = `translateY(${yOffset}px)`;
      }
    };

    window.addEventListener('scroll', handleHeroFade, { passive: true });
    handleHeroFade();

    if (!framesReady || framesRef.current.length === 0) return;

    let rafId: number;
    const totalFrames = framesRef.current.length - 1;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        
        // Map scroll directly to frame with exactly zero delay or gap.
        const progress = maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;
        const targetFrame = Math.round(progress * totalFrames);
        
        const frame = framesRef.current[targetFrame];
        if (frame && displayCanvasRef.current) {
          const cvs = displayCanvasRef.current;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.drawImage(frame, 0, 0, cvs.width, cvs.height);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initialize first frame

    return () => {
      window.removeEventListener('scroll', handleHeroFade);
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [framesReady]);

  return (
    <div className={`min-h-screen bg-black text-white font-[Manrope] overflow-x-hidden relative transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Video Background Layer */}
      <div ref={videoBgRef} className="fixed inset-0 w-full h-full z-0 pointer-events-none origin-center">
        {!framesReady && (
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            muted
            playsInline
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
          />
        )}
        <canvas
          ref={displayCanvasRef}
          className={`w-full h-full object-cover transition-opacity duration-500 origin-center ${framesReady ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      {/* Nav */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap">
        <div className="liquid-glass flex items-center justify-center rounded px-6 py-2.5">
          <div className="flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <a key={link} href="#" className="text-sm font-[Manrope] font-light text-white/70 hover:text-white transition-colors duration-200">
                {link}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Dynamic Sections Content - Fully Native Scrolling */}
      <div className="relative z-10 w-full pointer-events-none">
        
        {/* Section 0: Main Hero Component */}
        <div className="min-h-[100vh] flex flex-col justify-center items-start px-[8%] w-full relative">
          
          {/* Logo positioning - Top left near navbar */}
          <div className="absolute top-8 left-[8%] z-50 pointer-events-auto">
            <img src="/logo.png" alt="Treva Tech" className="h-10 md:h-12 w-auto opacity-90" />
          </div>

          {/* Main Hero Background Video */}
          <div 
             ref={heroVideoRef}
             className="absolute top-0 left-0 w-full h-[120vh] z-0 pointer-events-none will-change-transform"
             style={{
               maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 90%)',
               WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 90%)'
             }}
          >
             <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent z-10" />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-80" />
             <video 
                ref={heroVideoElementRef}
                autoPlay loop muted playsInline
                className="w-full h-full object-cover object-center opacity-80 mix-blend-screen"
             />
          </div>

          <div className="pointer-events-auto max-w-2xl z-10 relative">
            <p className="font-mono text-teal-400 mb-4 tracking-widest text-xs uppercase drop-shadow-md">01 // The Foundation</p>
            <h1 className="hero-title !text-left !text-[60px] md:!text-[100px] !leading-[0.85] !tracking-tight mb-6 drop-shadow-lg">We Build Growth<br/>Machines for Brokers</h1>
            <p className="font-[Manrope] text-lg font-light text-white/90 drop-shadow-md max-w-lg">AI-powered systems that find, convert, and retain traders.</p>
          </div>
        </div>

        {/* Section 1: Center Right */}
        <div className="min-h-screen flex flex-col justify-center items-end pr-[8%] w-full text-right">
          <div className="pointer-events-auto max-w-2xl">
            <p className="font-mono text-teal-400 mb-4 tracking-widest text-xs uppercase drop-shadow-md">02 // The Advantage</p>
            <h1 className="hero-title !text-right !text-[60px] md:!text-[100px] !leading-[0.85] !tracking-tight mb-6 drop-shadow-lg">Trading<br/>Industry DNA</h1>
            <p className="font-[Manrope] text-lg font-light text-white/90 drop-shadow-md">Our team built and ran broker operations before building growth systems. We speak your language IBs, lot volumes, retention funnels, compliance gates.</p>
          </div>
        </div>

        {/* Section 2: Center Left */}
        <div className="min-h-screen flex flex-col justify-center items-start pl-[8%] w-full">
          <div className="pointer-events-auto backdrop-blur-md bg-black/30 border border-white/10 p-8 md:p-12 rounded-[2rem] max-w-2xl shadow-2xl transition-all duration-500 hover:bg-black/40">
            <p className="font-mono text-teal-400 mb-4 tracking-widest text-xs uppercase">03 // The Process</p>
            <h1 className="hero-title !text-left !text-[60px] md:!text-[100px] !leading-[0.85] !tracking-tight mb-6">Outcome<br/>Obsessed</h1>
            <p className="font-[Manrope] text-lg font-light text-white/80">No vanity metrics. Every system is tracked against FTDs, qualified leads, and revenue. If it does not move the needle, we kill it.</p>
          </div>
        </div>

        {/* Section 3: Bottom Right */}
        <div className="min-h-screen flex flex-col justify-end items-end pb-[25vh] pr-[8%] w-full text-right">
          <div className="pointer-events-auto backdrop-blur-md bg-black/30 border border-white/10 p-8 md:p-12 rounded-[2rem] max-w-2xl shadow-2xl transition-all duration-500 hover:bg-black/40">
            <p className="font-mono text-teal-400 mb-4 tracking-widest text-xs uppercase">04 // The Boundary</p>
            <h1 className="hero-title !text-right !text-[60px] md:!text-[100px] !leading-[0.85] !tracking-tight mb-6">Compliance<br/>Built In</h1>
            <p className="font-[Manrope] text-lg font-light text-white/80">DFSA, FCA, CySEC, SC Malaysia — we build within the boundaries, not around them. Every campaign, asset, and system is designed for regulated environments.</p>
          </div>
        </div>

        {/* Section 4: Top Left */}
        <div className="min-h-screen flex flex-col justify-start items-start pt-[25vh] pl-[8%] w-full">
          <div className="pointer-events-auto backdrop-blur-md bg-black/30 border border-white/10 p-8 md:p-12 rounded-[2rem] max-w-2xl shadow-2xl transition-all duration-500 hover:bg-black/40">
            <p className="font-mono text-teal-400 mb-4 tracking-widest text-xs uppercase">05 // The Engine</p>
            <h1 className="hero-title !text-left !text-[60px] md:!text-[100px] !leading-[0.85] !tracking-tight mb-6">AI Growth<br/>Systems</h1>
             <ul className="font-[Manrope] text-lg font-light text-white/80 list-disc list-inside space-y-2">
              <li>Lead gen & automated outreach system</li>
              <li>AI voice agent</li>
              <li>AI chat agent & CRM integration</li>
              <li>AI automated content creation</li>
              <li>AI automated social media</li>
            </ul>
          </div>
        </div>

        {/* Section 5: Center Right */}
        <div className="min-h-screen flex flex-col justify-center items-end pr-[8%] w-full text-right">
          <div className="pointer-events-auto backdrop-blur-md bg-black/30 border border-white/10 p-8 md:p-12 rounded-[2rem] max-w-2xl shadow-2xl transition-all duration-500 hover:bg-black/40">
            <p className="font-mono text-teal-400 mb-4 tracking-widest text-xs uppercase">06 // The Strategy</p>
            <h1 className="hero-title !text-right !text-[60px] md:!text-[100px] !leading-[0.85] !tracking-tight mb-6">Performance<br/>Marketing</h1>
            <ul className="font-[Manrope] text-lg font-light text-white/80 list-none space-y-2">
              <li>Meta Ads &bull;</li>
              <li>Google Search Ads &bull;</li>
              <li>Google Display Ads &bull;</li>
              <li>SEO & GEO Optimization &bull;</li>
            </ul>
          </div>
        </div>

        {/* Section 6: Center */}
        <div className="min-h-screen flex flex-col justify-center items-center w-full text-center">
          <div className="pointer-events-auto backdrop-blur-md bg-black/30 border border-white/10 p-8 md:p-12 rounded-[2rem] max-w-4xl shadow-2xl transition-all duration-500 hover:bg-black/40">
            <p className="font-mono text-teal-400 mb-4 tracking-widest text-xs uppercase">07 // Global Scale</p>
            <h1 className="hero-title !text-[50px] md:!text-[80px] !leading-[0.95] !tracking-tight mb-6">Traders from more than 150<br/>countries around the world<br/>have registered!</h1>
          </div>
        </div>

      </div>

      {/* Action Buttons */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 transition-all duration-1000 delay-300 ${framesReady ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <button className="group relative bg-white text-black text-sm font-[Manrope] font-medium rounded px-6 py-3 overflow-hidden active:scale-[0.97] transition-all duration-200 shadow-[0_0_0_0_rgba(255,255,255,0)] hover:shadow-[0_0_24px_4px_rgba(255,255,255,0.25)] hover:scale-[1.03]">
          <span className="relative z-10">Let's talk</span>
          <span className="absolute inset-0 bg-gradient-to-b from-white to-white/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </button>
        <button className="liquid-glass group text-white text-sm font-[Manrope] font-medium rounded px-6 py-3 active:scale-[0.97] transition-all duration-200 hover:scale-[1.03] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_20px_2px_rgba(255,255,255,0.07)]">
          Strategic marketing
        </button>
      </div>

      {/* Scroll Indicator */}
      {framesReady && (
         <div className="fixed bottom-8 right-8 flex flex-col items-center gap-2 text-white/60 animate-bounce z-20 pointer-events-none transition-opacity duration-500">
            <ChevronDown size={24} strokeWidth={1.5} />
         </div>
      )}

      {/* Global Loading Overlay */}
      <div className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-1000 ${framesReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex flex-col items-center justify-center w-full max-w-[280px]">
          <div className="font-mono text-5xl text-white font-light tracking-widest mb-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {loadingProgress}<span className="text-xl text-white/40 ml-1">%</span>
          </div>
          
          <div className="w-full h-[1px] bg-white/10 relative overflow-hidden">
             <div className="absolute top-0 left-0 h-full bg-white transition-all duration-300 ease-out shadow-[0_0_10px_rgba(255,255,255,0.4)]" style={{ width: `${loadingProgress}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
