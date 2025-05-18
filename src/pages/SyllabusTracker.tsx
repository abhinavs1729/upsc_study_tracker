import React from 'react';

interface SyllabusTrackerProps {
  currentUser: {
    id: string;
    email: string;
    role: string;
  } | null;
}

const SyllabusTracker: React.FC<SyllabusTrackerProps> = ({ currentUser }) => {
  return (
    <div>
      <h1>Syllabus Tracker</h1>
      {/* Add your syllabus tracking functionality here */}
    </div>
  );
};

export default SyllabusTracker; 