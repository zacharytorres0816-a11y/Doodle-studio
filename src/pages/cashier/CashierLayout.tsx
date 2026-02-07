import { NavLink, Outlet } from 'react-router-dom';
import { PlusCircle, Gift, FileText, Printer, Truck } from 'lucide-react';

const subTabs = [
  { to: '/cashier/new-order', label: 'Add New Order', icon: PlusCircle },
  { to: '/cashier/raffle', label: 'Raffle', icon: Gift },
  { to: '/cashier/templated', label: 'Templated', icon: FileText },
  { to: '/cashier/to-print', label: 'To Print', icon: Printer },
  { to: '/cashier/delivery', label: 'Delivery', icon: Truck },
];

export default function CashierLayout() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-panel border-b border-border">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-panel-hover'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
