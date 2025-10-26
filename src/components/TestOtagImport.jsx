// Simple test to verify OtagIntegration export
import OtagIntegration from './OtagIntegration.jsx';

console.log('✅ OtagIntegration import test successful:', OtagIntegration);

// Test the component
if (typeof OtagIntegration === 'function') {
  console.log('✅ OtagIntegration is a valid React component function');
} else {
  console.log('❌ OtagIntegration is not a function:', typeof OtagIntegration);
}

export default function TestOtagImport() {
  return null;
}
