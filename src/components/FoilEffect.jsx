import React, { useRef, useEffect } from 'react';

/**
 * FoilEffect - A canvas-based foil animation component
 * This uses direct canvas drawing to create the foil effect
 * instead of relying on CSS animations that might reset
 */
function FoilEffect({ active = false, style = {} }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const gradientPhaseRef = useRef(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const resize = () => {
      // Get actual dimensions from parent element
      const parent = canvas.parentElement;
      if (!parent) return;
      
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    };
    
    // Initial resize
    resize();
    
    // Listen for resize events
    window.addEventListener('resize', resize);
    
    const drawGradient = (phase) => {
      if (!ctx) return;
      
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!active) return; // Don't draw if not active
      
      // Create gradient
      const gradient = ctx.createLinearGradient(
        0, 0, 
        canvas.width * Math.cos(phase), 
        canvas.height * Math.sin(phase)
      );
      
      // Add colors with offset based on phase
      gradient.addColorStop(0, 'rgba(255, 190, 220, 0.6)');
      gradient.addColorStop(0.16, 'rgba(200, 190, 255, 0.6)');
      gradient.addColorStop(0.33, 'rgba(190, 220, 255, 0.6)');
      gradient.addColorStop(0.5, 'rgba(190, 255, 220, 0.6)');
      gradient.addColorStop(0.66, 'rgba(220, 255, 190, 0.6)');
      gradient.addColorStop(0.83, 'rgba(255, 220, 190, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 190, 220, 0.6)');
      
      // Apply the gradient
      ctx.fillStyle = gradient;
      ctx.globalCompositeOperation = 'overlay';
      
      // Fill with rounded corners
      const radius = 10;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(canvas.width - radius, 0);
      ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
      ctx.lineTo(canvas.width, canvas.height - radius);
      ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
      ctx.lineTo(radius, canvas.height);
      ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();
    };
    
    const animate = () => {
      // Increment the phase
      gradientPhaseRef.current += 0.005;
      if (gradientPhaseRef.current > Math.PI * 2) {
        gradientPhaseRef.current = 0;
      }
      
      drawGradient(gradientPhaseRef.current);
      
      // Continue the animation loop if active
      if (active) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    // Start the animation if active
    if (active) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Just draw once to clear
      drawGradient(0);
    }
    
    return () => {
      // Clean up
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active]);
  
  // Effect to handle changes in active state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (active) {
      // Start animation if not already running
      if (!animationRef.current) {
        const animate = () => {
          // Increment the phase
          gradientPhaseRef.current += 0.005;
          if (gradientPhaseRef.current > Math.PI * 2) {
            gradientPhaseRef.current = 0;
          }
          
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          // Clear the canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Create gradient
          const gradient = ctx.createLinearGradient(
            0, 0, 
            canvas.width * Math.cos(gradientPhaseRef.current), 
            canvas.height * Math.sin(gradientPhaseRef.current)
          );
          
          // Add colors with offset based on phase
          gradient.addColorStop(0, 'rgba(255, 190, 220, 0.6)');
          gradient.addColorStop(0.16, 'rgba(200, 190, 255, 0.6)');
          gradient.addColorStop(0.33, 'rgba(190, 220, 255, 0.6)');
          gradient.addColorStop(0.5, 'rgba(190, 255, 220, 0.6)');
          gradient.addColorStop(0.66, 'rgba(220, 255, 190, 0.6)');
          gradient.addColorStop(0.83, 'rgba(255, 220, 190, 0.6)');
          gradient.addColorStop(1, 'rgba(255, 190, 220, 0.6)');
          
          // Apply the gradient
          ctx.fillStyle = gradient;
          ctx.globalCompositeOperation = 'overlay';
          
          // Fill with rounded corners
          const radius = 10;
          ctx.beginPath();
          ctx.moveTo(radius, 0);
          ctx.lineTo(canvas.width - radius, 0);
          ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
          ctx.lineTo(canvas.width, canvas.height - radius);
          ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
          ctx.lineTo(radius, canvas.height);
          ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
          ctx.lineTo(0, radius);
          ctx.quadraticCurveTo(0, 0, radius, 0);
          ctx.closePath();
          ctx.fill();
          
          // Continue the animation loop
          animationRef.current = requestAnimationFrame(animate);
        };
        
        animationRef.current = requestAnimationFrame(animate);
      }
    } else {
      // Stop animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        
        // Clear the canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [active]);
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: '10px',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: active ? 0.4 : 0,
        transition: 'opacity 0.3s ease',
        ...style
      }}
    />
  );
}

export default FoilEffect;
