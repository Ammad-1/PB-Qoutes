import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import PrintMethods from './pages/PrintMethods'
import Customers from './pages/Customers'
import QuoteBuilder from './pages/QuoteBuilder'
import QuoteHistory from './pages/QuoteHistory'
import Settings from './pages/Settings'

const NavItem = ({ to, children }) => (
  <NavLink to={to} className={({ isActive }) => `px-3 py-2 rounded ${isActive ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-100'}`}>
    {children}
  </NavLink>
)

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 items-center">
          <div className="font-bold text-xl">Printberry Ltd</div>
          <nav className="ml-6 flex gap-2 text-sm">
            <NavItem to="/">Dashboard</NavItem>
            <NavItem to="/products">Products</NavItem>
            <NavItem to="/print-methods">Print Methods</NavItem>
            <NavItem to="/customers">Customers</NavItem>
            <NavItem to="/quote">New Quote</NavItem>
            <NavItem to="/history">History</NavItem>
            <NavItem to="/settings">Settings</NavItem>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/print-methods" element={<PrintMethods />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/quote" element={<QuoteBuilder />} />
          <Route path="/history" element={<QuoteHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}



