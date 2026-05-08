import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';

const STAGES = [
  { key: 'onboarding', name: 'Onboarding', shortName: 'Onboard', icon: '📋' },
  { key: 'marketResearch', name: 'Market Research', shortName: 'Research', icon: '🔍' },
  { key: 'offerEngineering', name: 'Offer Engineering', shortName: 'Offer', icon: '🎁' },
  { key: 'trafficStrategy', name: 'Traffic Strategy', shortName: 'Traffic', icon: '📈' },
  { key: 'landingPage', name: 'Landing Page', shortName: 'Landing', icon: '📄' },
  { key: 'creativeStrategy', name: 'Creative Strategy', shortName: 'Creative', icon: '💡' },
];

export default function StageProgressTracker({ stages, currentStage }) {
  // Check if all stages are completed (currentStage = 7 means completed)
  const allCompleted = currentStage === 7 || STAGES.every(stage => stages?.[stage.key]?.isCompleted);

  const getStageStatus = (stageKey, index) => {
    const stageData = stages?.[stageKey];
    const isCompleted = stageData?.isCompleted || allCompleted;
    const isCurrent = currentStage === index + 1 && !allCompleted;
    const isLocked = !isCompleted && !isCurrent && index > 0 && !allCompleted;

    // Check if all previous stages are completed
    let previousCompleted = true;
    for (let i = 0; i < index; i++) {
      if (!stages?.[STAGES[i].key]?.isCompleted && !allCompleted) {
        previousCompleted = false;
        break;
      }
    }

    return {
      isCompleted,
      isCurrent: isCurrent && previousCompleted,
      isLocked: !previousCompleted || (isLocked && !isCompleted),
      isAccessible: previousCompleted || allCompleted,
    };
  };

  return (
    <div className="w-full">
      {/* Mobile: Scrollable horizontal layout */}
      <div className="overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-start justify-between gap-1 sm:gap-2 min-w-[480px] sm:min-w-0 sm:w-full">
          {STAGES.map((stage, index) => {
            const status = getStageStatus(stage.key, index);

            return (
              <div key={stage.key} className="flex-1 flex flex-col items-center">
                {/* Stage circle */}
                <div
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm sm:text-base md:text-lg font-medium flex-shrink-0',
                    'transition-all duration-300',
                    status.isCompleted && 'bg-green-500 text-white',
                    status.isLocked && 'bg-gray-200 text-gray-400',
                    !status.isCompleted && !status.isLocked && !status.isCurrent && 'bg-primary-100 text-primary-600',
                    status.isCurrent && 'bg-primary-500 text-white ring-2 ring-primary-200'
                  )}
                >
                  {status.isCompleted ? (
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  ) : status.isLocked ? (
                    <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                  ) : (
                    <span>{stage.icon}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-1 sm:mt-1.5 md:mt-2 text-[9px] sm:text-[10px] md:text-xs font-medium text-center leading-tight',
                    status.isCompleted && 'text-green-600',
                    status.isLocked && 'text-gray-400',
                    !status.isCompleted && !status.isLocked && 'text-gray-700'
                  )}
                >
                  <span className="sm:hidden">{stage.shortName}</span>
                  <span className="hidden sm:inline">{stage.name}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}