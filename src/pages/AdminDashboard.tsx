import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Service, Location as ServiceLocation, Booking, UserProfile } from '../types';
import { 
  LayoutDashboard, Settings, Users, Briefcase, MapPin, 
  Plus, Edit2, Trash2, Check, X, Clock, User as UserIcon,
  Search, Filter, ChevronRight, IndianRupee, Phone
} from 'lucide-react';

export default function AdminDashboard() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50 pt-20 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden lg:block">
        <div className="p-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Admin Panel</h2>
          <nav className="space-y-1">
            <SidebarLink to="/admin" icon={<LayoutDashboard size={18} />} label="Overview" active={location.pathname === '/admin'} />
            <SidebarLink to="/admin/bookings" icon={<Briefcase size={18} />} label="Bookings" active={location.pathname === '/admin/bookings'} />
            <SidebarLink to="/admin/services" icon={<Settings size={18} />} label="Services" active={location.pathname === '/admin/services'} />
            <SidebarLink to="/admin/locations" icon={<MapPin size={18} />} label="Locations" active={location.pathname === '/admin/locations'} />
            <SidebarLink to="/admin/users" icon={<Users size={18} />} label="Users & Providers" active={location.pathname === '/admin/users'} />
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/bookings" element={<AdminBookings />} />
          <Route path="/services" element={<AdminServices />} />
          <Route path="/locations" element={<AdminLocations />} />
          <Route path="/users" element={<AdminUsers />} />
        </Routes>
      </main>
    </div>
  );
}

function SidebarLink({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link 
      to={to} 
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function AdminOverview() {
  const [stats, setStats] = useState({ bookings: 0, users: 0, providers: 0, revenue: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      const usersSnap = await getDocs(collection(db, 'users'));
      
      const bookings = bookingsSnap.docs.map(d => d.data() as Booking);
      const users = usersSnap.docs.map(d => d.data() as UserProfile);
      
      const totalRevenue = bookings.reduce((acc, b) => acc + (b.status === 'completed' ? b.totalCost : 0), 0);
      
      setStats({
        bookings: bookings.length,
        users: users.filter(u => u.role === 'user').length,
        providers: users.filter(u => u.role === 'provider').length,
        revenue: totalRevenue
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Bookings" value={stats.bookings} icon={<Briefcase className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard label="Total Revenue" value={`₹${stats.revenue}`} icon={<IndianRupee className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard label="Customers" value={stats.users} icon={<UserIcon className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard label="Service Providers" value={stats.providers} icon={<Users className="text-emerald-600" />} color="bg-emerald-50" />
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6">Recent Activity</h3>
        <p className="text-gray-500 text-sm">No recent activity to show.</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
      <div className={`p-4 rounded-2xl ${color}`}>{icon}</div>
      <div>
        <div className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', baseCost: 0, category: '', imageUrl: '', locationIds: [] as string[] });

  const fetchServices = async () => {
    const q = query(collection(db, 'services'), orderBy('name'));
    const snap = await getDocs(q);
    setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
  };

  const fetchLocations = async () => {
    const snap = await getDocs(collection(db, 'locations'));
    setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceLocation)));
  };

  useEffect(() => { 
    fetchServices(); 
    fetchLocations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      await updateDoc(doc(db, 'services', editingService.id), formData);
    } else {
      await addDoc(collection(db, 'services'), formData);
    }
    setIsModalOpen(false);
    setEditingService(null);
    setFormData({ name: '', description: '', baseCost: 0, category: '', imageUrl: '', locationIds: [] });
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      await deleteDoc(doc(db, 'services', id));
      fetchServices();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Services</h1>
        <button 
          onClick={() => { setEditingService(null); setFormData({ name: '', description: '', baseCost: 0, category: '', imageUrl: '', locationIds: [] }); setIsModalOpen(true); }}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center hover:bg-emerald-700 transition-all"
        >
          <Plus size={18} className="mr-2" /> Add Service
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Service</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Base Cost</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map(service => (
              <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <img src={service.imageUrl} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    <div>
                      <div className="font-bold text-gray-900">{service.name}</div>
                      <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                        Available in {(service.locationIds || []).length} locations
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{service.category}</td>
                <td className="px-6 py-4 font-bold text-gray-900">₹{service.baseCost}</td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => { 
                        setEditingService(service); 
                        setFormData({
                          name: service.name,
                          description: service.description,
                          baseCost: service.baseCost,
                          category: service.category,
                          imageUrl: service.imageUrl,
                          locationIds: service.locationIds || []
                        }); 
                        setIsModalOpen(true); 
                      }}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(service.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingService ? 'Edit Service' : 'Add New Service'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Cost (₹)</label>
                  <input required type="number" value={formData.baseCost} onChange={e => setFormData({...formData, baseCost: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                <input required value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Locations</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-4 border border-gray-200 rounded-xl">
                  {locations.map(loc => (
                    <label key={loc.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.locationIds.includes(loc.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked 
                            ? [...formData.locationIds, loc.id]
                            : formData.locationIds.filter(id => id !== loc.id);
                          setFormData({...formData, locationIds: newIds});
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{loc.name}</span>
                    </label>
                  ))}
                  {locations.length === 0 && <div className="text-xs text-gray-400">No locations created yet</div>}
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all">
                {editingService ? 'Update Service' : 'Create Service'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminLocations() {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchLocations = async () => {
    const snap = await getDocs(collection(db, 'locations'));
    setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceLocation)));
  };

  useEffect(() => { fetchLocations(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await addDoc(collection(db, 'locations'), { name: newName });
    setNewName('');
    fetchLocations();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    await updateDoc(doc(db, 'locations', editingId), { name: editName });
    setEditingId(null);
    setEditName('');
    fetchLocations();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      await deleteDoc(doc(db, 'locations', id));
      fetchLocations();
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Manage Locations</h1>
      
      <form onSubmit={editingId ? handleUpdate : handleAdd} className="flex space-x-4">
        <input 
          required 
          value={editingId ? editName : newName} 
          onChange={e => editingId ? setEditName(e.target.value) : setNewName(e.target.value)} 
          placeholder="Enter location name (e.g. Guntur West)" 
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
          {editingId ? 'Update' : 'Add'}
        </button>
        {editingId && (
          <button 
            type="button" 
            onClick={() => { setEditingId(null); setEditName(''); }}
            className="bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        )}
      </form>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {locations.map(loc => (
            <div key={loc.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <span className="font-medium text-gray-700">{loc.name}</span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => { setEditingId(loc.id); setEditName(loc.name); }}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(loc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {locations.length === 0 && <div className="p-8 text-center text-gray-500">No locations added yet.</div>}
        </div>
      </div>
    </div>
  );
}

function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const bSnap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')));
    setBookings(bSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
    
    const pSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'provider'), where('isApproved', '==', true)));
    setProviders(pSnap.docs.map(d => d.data() as UserProfile));
    
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async (bookingId: string, providerId: string) => {
    const provider = providers.find(p => p.uid === providerId);
    if (!provider) return;
    
    await updateDoc(doc(db, 'bookings', bookingId), {
      providerId: provider.uid,
      providerName: provider.displayName,
      providerPhone: provider.phone || '',
      status: 'assigned'
    });
    fetchData();
  };

  const updateStatus = async (bookingId: string, status: string) => {
    await updateDoc(doc(db, 'bookings', bookingId), { status });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Manage Bookings</h1>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Booking Info</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Location</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Schedule</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Payment</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Service Provider</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map(booking => (
              <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{booking.serviceName}</div>
                  <div className="text-xs text-gray-500">ID: {booking.id.slice(0, 8)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{booking.userName}</div>
                  <div className="text-xs text-gray-500">{booking.userPhone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-gray-900 line-clamp-2 max-w-[200px]">{booking.address}</div>
                  <div className="text-[10px] text-gray-500">{booking.city}, {booking.pincode}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-700">{booking.serviceDate}</div>
                  <div className="text-xs text-gray-500">{booking.serviceTime}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-emerald-600">₹{booking.advancePaid}</div>
                  <div className="text-[10px] text-gray-400">ID: {booking.paymentId?.slice(0, 12)}...</div>
                  {booking.remainingPaid ? (
                    <span className="text-[10px] text-green-600 font-bold">Full Paid</span>
                  ) : (
                    <span className="text-[10px] text-orange-600 font-bold">Advance Only</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    booking.status === 'completed' ? 'bg-green-100 text-green-600' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                    booking.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                    booking.status === 'provider-finished' ? 'bg-orange-100 text-orange-600' :
                    booking.status === 'assigned' ? 'bg-emerald-100 text-emerald-600' :
                    booking.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {booking.status === 'completed' ? 'Work Finished' : 
                     booking.status === 'provider-finished' ? 'Provider Finished' :
                     booking.status === 'in-progress' ? 'Work Started' : 
                     booking.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select 
                    className="text-xs border border-gray-200 rounded-lg p-1 outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                    onChange={(e) => handleAssign(booking.id, e.target.value)}
                    value={booking.providerId || ""}
                  >
                    <option value="" disabled>Assign Provider</option>
                    {providers.map(p => (
                      <option key={p.uid} value={p.uid}>{p.displayName} ({p.phone || 'No Phone'})</option>
                    ))}
                  </select>
                  {booking.providerName && (
                    <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-emerald-700 font-bold uppercase">Assigned Provider</div>
                      <div className="text-xs font-bold text-gray-900">{booking.providerName}</div>
                      {booking.providerPhone && (
                        <div className="text-[10px] text-gray-500 flex items-center mt-0.5">
                          <Phone size={10} className="mr-1" /> {booking.providerPhone}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button onClick={() => updateStatus(booking.id, 'completed')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Mark Completed"><Check size={16} /></button>
                    <button onClick={() => updateStatus(booking.id, 'cancelled')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Cancel Booking"><X size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, 'users'));
    setUsers(snap.docs.map(d => d.data() as UserProfile));
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleApproval = async (uid: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'users', uid), { isApproved: !currentStatus });
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Users & Providers</h1>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Phone</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Location</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => (
              <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{user.displayName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.phone || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4">
                  <div className="text-xs text-gray-600 line-clamp-1 max-w-[150px]" title={user.address}>
                    {user.address || 'No address set'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : user.role === 'provider' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.role === 'provider' && (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${user.isApproved ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                      {user.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {user.role === 'provider' && (
                    <button 
                      onClick={() => toggleApproval(user.uid, user.isApproved || false)}
                      className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${user.isApproved ? 'border-red-100 text-red-600 hover:bg-red-50' : 'border-green-100 text-green-600 hover:bg-green-50'}`}
                    >
                      {user.isApproved ? 'Revoke' : 'Approve'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
