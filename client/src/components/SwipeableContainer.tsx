import { useState, useRef, ReactNode, TouchEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwipeableContainerProps {
  children: ReactNode[];
  showIndicators?: boolean;
  showArrows?: boolean;
}

export default function SwipeableContainer({ 
  children, 
  showIndicators = true,
  showArrows = true 
}: SwipeableContainerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
  // The minimum distance (in pixels) required for a swipe to be recognized
  const minSwipeDistance = 50;
  
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && activeIndex < children.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else if (isRightSwipe && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
    
    // Reset values
    touchStartX.current = null;
    touchEndX.current = null;
  };
  
  const goToPrevious = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };
  
  const goToNext = () => {
    if (activeIndex < children.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };
  
  return (
    <div className="relative overflow-hidden">
      <div 
        className="relative w-full" 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex transition-transform duration-300 ease-in-out" 
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {children.map((child, index) => (
            <div 
              key={index} 
              className="w-full flex-shrink-0"
            >
              {child}
            </div>
          ))}
        </div>
      </div>
      
      {/* Arrow navigation */}
      {showArrows && (
        <>
          <Button
            variant="outline"
            size="icon"
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white bg-opacity-70 ${activeIndex === 0 ? 'opacity-0 pointer-events-none' : ''}`}
            onClick={goToPrevious}
            disabled={activeIndex === 0}
          >
            <ChevronLeftIcon size={18} />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white bg-opacity-70 ${activeIndex === children.length - 1 ? 'opacity-0 pointer-events-none' : ''}`}
            onClick={goToNext}
            disabled={activeIndex === children.length - 1}
          >
            <ChevronRightIcon size={18} />
          </Button>
        </>
      )}
      
      {/* Dot indicators */}
      {showIndicators && children.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
          {children.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full ${index === activeIndex ? 'bg-primary' : 'bg-gray-300'}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}