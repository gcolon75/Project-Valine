import React from "react";

/** Minimal card that matches your .card styles from global.css */
export function Card({ className = "", children, ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

// Optional convenience pieces if you want to use them later:
Card.Header = function CardHeader({ className = "", children, ...props }) {
  return <div className={`card-header ${className}`} {...props}>{children}</div>;
};
Card.Body = function CardBody({ className = "", children, ...props }) {
  return <div className={`card-body ${className}`} {...props}>{children}</div>;
};
Card.Footer = function CardFooter({ className = "", children, ...props }) {
  return <div className={`card-footer ${className}`} {...props}>{children}</div>;
};

// Default export too, so either `import Card from ...` or `import { Card } ...` works.
export default Card;
