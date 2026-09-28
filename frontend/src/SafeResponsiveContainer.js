import React from "react";
import { ResponsiveContainer } from "recharts";

/**
 * SafeResponsiveContainer wraps Recharts ResponsiveContainer with explicit initialDimension
 * and container styling to prevent the "width(-1) and height(-1) should be greater than 0" warning.
 */
export default function SafeResponsiveContainer({
  children,
  width = "100%",
  height = "100%",
  minWidth = 0,
  minHeight = 200,
  initialWidth = 800,
  initialHeight = 300,
  style = {},
  ...props
}) {
  const containerStyle = {
    width: "100%",
    height: typeof height === "number" ? `${height}px` : height,
    minHeight: `${minHeight}px`,
    position: "relative",
    ...style
  };

  return (
    <div className="safe-chart-container" style={containerStyle}>
      <ResponsiveContainer
        width={width}
        height={height}
        minWidth={minWidth}
        minHeight={minHeight}
        initialDimension={{
          width: initialWidth,
          height: typeof height === "number" ? height : initialHeight
        }}
        {...props}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
}
