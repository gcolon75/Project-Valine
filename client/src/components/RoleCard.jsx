import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * RoleCard
 * - Uniform width/height
 * - Clickable card + button
 * - Keyboard accessible (Enter/Space triggers)
 */
export default function RoleCard({ img, title, cta, to }) {
  const navigate = useNavigate();

  const go = () => navigate(to);

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  };

  return (
    <div
      className="role-card"
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={onKeyDown}
      aria-label={title}
    >
      <div className="role-thumb">
        <img src={img} alt="" />
      </div>
      <div className="role-body">
        <h3 className="role-title">{title}</h3>
        <button
          type="button"
          className="role-cta"
          onClick={(e) => {
            e.stopPropagation();
            go();
          }}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}