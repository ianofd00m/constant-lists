// React-specific foil animation debugging
// Include this in your React project to monitor component rendering and animation resets

import React, { useEffect } from 'react';

// Monkey patch React's useState to track state changes related to foil
const originalUseState = React.useState;
React.useState = function patchedUseState(initialState) {
  const [state, setState] = originalUseState(initialState);
  
  // Create patched setState that logs state changes
  const patchedSetState = (newState) => {
    console.log('[FOIL-DEBUG] useState update:', {
      prevState: state,
      newState: typeof newState === 'function' ? newState(state) : newState,
      stack: new Error().stack
    });
    return setState(newState);
  };
  
  return [state, patchedSetState];
};

// Component for debugging foil animations in React
export const FoilDebugMonitor = () => {
  useEffect(() => {
    console.log('[FOIL-DEBUG] FoilDebugMonitor initialized');
    
    // Track component renders
    const renderCountMap = new Map();
    
    // Monkey patch React.createElement to track component renders
    const originalCreateElement = React.createElement;
    React.createElement = function(type, props, ...children) {
      const element = originalCreateElement(type, props, ...children);
      
      // Only track components with foil-related class names
      if (
        props && 
        typeof props.className === 'string' && 
        (props.className.includes('foil') || props.className.includes('card-name'))
      ) {
        const componentName = typeof type === 'string' ? type : type.displayName || type.name || 'Component';
        const count = renderCountMap.get(componentName) || 0;
        renderCountMap.set(componentName, count + 1);
        
        if (count % 10 === 0) { // Log every 10 renders to avoid console spam
          console.log(`[FOIL-DEBUG] Component rendered ${count + 1} times:`, {
            type: componentName,
            props,
            hasFoil: props.className.includes('foil')
          });
        }
      }
      
      return element;
    };
    
    // Track hover events on card elements
    const trackHoverEvents = () => {
      document.body.addEventListener('mouseover', (event) => {
        const cardElements = document.querySelectorAll('.card-name, .card-list-item');
        const hoverTarget = event.target.closest('.card-name, .card-list-item');
        
        if (hoverTarget) {
          console.log('[FOIL-DEBUG] Hover detected:', {
            element: hoverTarget,
            className: hoverTarget.className,
            timestamp: new Date().getTime()
          });
          
          // Check if any foil animations restart after hover
          setTimeout(() => {
            document.querySelectorAll('.foil').forEach(el => {
              if (el !== hoverTarget) {
                console.log('[FOIL-DEBUG] Checking post-hover animation:', {
                  element: el,
                  animationPlayState: window.getComputedStyle(el).animationPlayState,
                  reactId: el._reactInternalInstance || 'unknown'
                });
              }
            });
          }, 100);
        }
      });
    };
    
    // Function to check all foil elements' animation states
    const checkFoilAnimations = () => {
      const foilElements = document.querySelectorAll('.foil, .foil-active-border');
      
      foilElements.forEach(el => {
        const style = window.getComputedStyle(el);
        console.log('[FOIL-DEBUG] Foil element state:', {
          element: el,
          className: el.className,
          animationName: style.animationName,
          animationPlayState: style.animationPlayState,
          reactInternal: el._reactInternalInstance || 'unknown'
        });
      });
    };
    
    // Add global debug methods
    window.debugFoil = {
      checkAnimations: checkFoilAnimations,
      getRenderCounts: () => Object.fromEntries(renderCountMap),
      trackHovers: trackHoverEvents
    };
    
    // Start tracking hover events
    trackHoverEvents();
    
    // Clean up on unmount
    return () => {
      React.createElement = originalCreateElement;
      React.useState = originalUseState;
      console.log('[FOIL-DEBUG] FoilDebugMonitor cleanup');
    };
  }, []);
  
  return null; // This component doesn't render anything
};

// Export a HOC to wrap components for detailed render tracking
export const withFoilDebug = (WrappedComponent) => {
  return function WithFoilDebug(props) {
    const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
    
    useEffect(() => {
      console.log(`[FOIL-DEBUG] ${componentName} mounted`, props);
      return () => console.log(`[FOIL-DEBUG] ${componentName} unmounted`);
    }, []);
    
    useEffect(() => {
      console.log(`[FOIL-DEBUG] ${componentName} props updated`, props);
    });
    
    // Check if any prop contains foil state
    const hasFoilProp = Object.values(props).some(prop => 
      prop && typeof prop === 'object' && prop.foil === true
    );
    
    if (hasFoilProp) {
      console.log(`[FOIL-DEBUG] ${componentName} has foil prop:`, props);
    }
    
    return <WrappedComponent {...props} />;
  };
};

export default FoilDebugMonitor;
