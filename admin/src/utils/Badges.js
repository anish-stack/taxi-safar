  export const getPaymentStatusBadge = (status) => {
    const map = {
      completed: { bg: 'bg-success-focus', text: 'text-success-main' },
      pending: { bg: 'bg-warning-focus', text: 'text-warning-main' },
      failed: { bg: 'bg-danger-focus', text: 'text-danger-main' },
    };
    const style = map[status] || { bg: 'bg-secondary-focus', text: 'text-secondary-main' };
    return (
      <span className={`px-24 py-4 rounded-pill text-sm fw-medium ${style.bg} ${style.text}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };
  export const getRideStatusBadge = (status) => {
  const map = {
    pending: { bg: "bg-warning-focus", text: "text-warning-main" },

    "driver-assigned": { bg: "bg-info-focus", text: "text-info-main" },
    "driver-accepted": { bg: "bg-primary-focus", text: "text-primary-main" },
    "driver-rejected": { bg: "bg-danger-focus", text: "text-danger-main" },

    completed: { bg: "bg-success-focus", text: "text-success-main" },

    "cancelled-by-customer": { bg: "bg-secondary-focus", text: "text-secondary-main" },
    "cancelled-by-driver": { bg: "bg-secondary-focus", text: "text-secondary-main" },
    "cancelled-by-admin": { bg: "bg-secondary-focus", text: "text-secondary-main" },

    "no-show": { bg: "bg-dark-focus", text: "text-dark-main" },

    failed: { bg: "bg-danger-focus", text: "text-danger-main" },
  };

  const style = map[status] || { bg: "bg-secondary-focus", text: "text-secondary-main" };

  const label = status
    ?.replace(/-/g, " ") // convert "cancelled-by-customer" → "cancelled by customer"
    .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize every word

  return (
    <span className={`px-24 py-4 rounded-pill text-sm fw-medium ${style.bg} ${style.text}`}>
      {label}
    </span>
  );
};


  export const getTripTypeBadge = (type) => {
    const map = {
      'one-way': { bg: 'bg-info-focus', text: 'text-info-main', label: 'One Way' },
      'round-trip': { bg: 'bg-purple-focus', text: 'text-purple-main', label: 'Round Trip' },
    };
    const style = map[type] || { bg: 'bg-secondary-focus', text: 'text-secondary-main', label: type };
    return (
      <span className={`px-12 py-4 rounded-pill text-xs fw-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  export const getVehicleTypeBadge = (type) => {
    const colors = {
      sedan: 'bg-primary-focus text-primary-main',
      suv: 'bg-success-focus text-success-main',
      hatchback: 'bg-info-focus text-info-main',
      luxury: 'bg-warning-focus text-warning-main',
    };
    return (
      <span className={`px-12 py-4 rounded-pill text-xs fw-medium ${colors[type] || 'bg-secondary-focus text-secondary-main'}`}>
        {type?.toUpperCase()}
      </span>
    );
  };
