import React from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  variant?: "default" | "shopping" | "success";
}

/**
 * EmptyState component for displaying graceful empty list states
 * with icon, description, and call-to-action button
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = "default",
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "shopping":
        return {
          container:
            "p-8 bg-amber-50 rounded-lg border-2 border-dashed border-amber-200",
          title: "text-gray-600 text-lg font-medium",
          description: "text-gray-500",
          button: "bg-amber-600 hover:bg-amber-700 text-white",
        };
      case "success":
        return {
          container:
            "p-8 bg-green-50 rounded-lg border-2 border-dashed border-green-200",
          title: "text-gray-600 text-lg font-medium",
          description: "text-gray-500",
          button: "bg-green-600 hover:bg-green-700 text-white",
        };
      default:
        return {
          container:
            "p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg",
          title: "text-lg font-medium",
          description: "text-sm",
          button: "bg-amber-600 hover:bg-amber-700 text-white",
        };
    }
  };

  const classes = getVariantClasses();

  return (
    <div className={`${classes.container} text-center`}>
      <div className="text-4xl mb-4">{icon}</div>
      <div className={`${classes.title} mb-2`}>{title}</div>
      <div className={`${classes.description} mb-4`}>{description}</div>
      <button
        onClick={onAction}
        className={`${classes.button} px-4 py-2 rounded font-medium transition`}
      >
        {actionLabel}
      </button>
    </div>
  );
};
