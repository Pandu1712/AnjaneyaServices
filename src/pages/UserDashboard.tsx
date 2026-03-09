import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Booking } from '../types';
import { Briefcase, Clock, CheckCircle, XCircle, MapPin, IndianRupee, Calendar, User as UserIcon, Edit2, X, CreditCard, Phone } from 'lucide-react';

export default function UserDashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    displayName: profile?.displayName || '',
    phone: profile?.phone || '',
    address: profile?.address || ''
  });
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'bookings'), 
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const fetchedBookings = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      
      // Sort in-memory to avoid composite index requirement
      fetchedBookings.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      setBookings(fetchedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), editFormData);
      await refreshProfile();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleAddressChange = async (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const value = e.target.value;
    setEditFormData({ ...editFormData, address: value });
    
    if (value.length > 2) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${value}&addressdetails=1&limit=5`);
        const data = await res.json();
        setAddressSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: any) => {
    setEditFormData({ ...editFormData, address: suggestion.display_name });
    setShowSuggestions(false);
  };

  const handleRemainingPayment = async (booking: Booking) => {
    if (!user) return;
    
    const remainingAmount = booking.totalCost - booking.advancePaid;
    
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
      amount: remainingAmount * 100,
      currency: "INR",
      name: "Anjaneya Services",
      description: `Final Payment for ${booking.serviceName}`,
      handler: async function (response: any) {
        try {
          await updateDoc(doc(db, 'bookings', booking.id), {
            remainingPaid: true,
            finalPaymentId: response.razorpay_payment_id
          });
          // Refresh bookings
          fetchBookings();
          alert("Payment successful! Thank you for choosing Anjaneya Services.");
        } catch (error) {
          console.error("Error updating payment:", error);
        }
      },
      prefill: {
        name: user.displayName,
        email: user.email
      },
      theme: {
        color: "#059669"
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const confirmCompletion = async (bookingId: string) => {
    if (window.confirm('Are you sure the work is finished and you want to confirm?')) {
      await updateDoc(doc(db, 'bookings', bookingId), { status: 'completed' });
      fetchBookings();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="flex items-center space-x-6">
            <div className="relative group">
              <img src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} className="w-20 h-20 rounded-3xl shadow-lg" alt="" />
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-md text-emerald-600 hover:text-emerald-700 transition-all border border-gray-100"
              >
                <Edit2 size={16} />
              </button>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hello, {profile?.displayName}</h1>
              <p className="text-gray-500">{profile?.email}</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3">
              <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><Briefcase size={20} /></div>
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold">Total Bookings</div>
                <div className="text-xl font-bold">{bookings.length}</div>
              </div>
            </div>
          </div>
        </div>

        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-blue-600 text-white text-center relative">
                <h3 className="text-xl font-bold">{profile?.displayName}</h3>
                <p className="text-blue-100 text-sm">{profile?.email}</p>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editFormData.displayName}
                    onChange={(e) => setEditFormData({...editFormData, displayName: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Address</label>
                  <textarea 
                    rows={3}
                    value={editFormData.address}
                    onChange={handleAddressChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your address"
                  />
                  
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl mb-2 max-h-60 overflow-y-auto z-20">
                      {addressSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectSuggestion(suggestion)}
                          className="w-full text-left px-4 py-4 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 flex items-start group"
                        >
                          <div className="bg-gray-100 p-2 rounded-lg mr-4 group-hover:bg-blue-100 transition-colors">
                            <MapPin size={18} className="text-gray-400 group-hover:text-blue-600" />
                          </div>
                          <span className="text-gray-700 leading-relaxed">{suggestion.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 mb-8">Your Booking History</h2>

        {loading ? (
          <div className="text-center py-20">Loading your history...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-500 mb-6">You haven't booked any services yet. Start your first booking today!</p>
            <a href="/#services" className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all">Browse Services</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gray-900 text-white p-4 rounded-2xl">
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{booking.serviceName}</h3>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="flex items-center"><Calendar size={14} className="mr-1" /> {booking.serviceDate}</span>
                        <span className="flex items-center"><Clock size={14} className="mr-1" /> {booking.serviceTime}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="bg-gray-50 px-4 py-2 rounded-xl">
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Status</div>
                      <div className={`text-sm font-bold uppercase ${
                        booking.status === 'completed' ? 'text-green-600' :
                        booking.status === 'pending' ? 'text-yellow-600' :
                        booking.status === 'provider-finished' ? 'text-orange-600' :
                        booking.status === 'reached' ? 'text-purple-600' :
                        booking.status === 'cancelled' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {booking.status === 'completed' ? 'Work Finished' : 
                         booking.status === 'provider-finished' ? 'Provider Finished' :
                         booking.status === 'in-progress' ? 'Work Started' : 
                         booking.status === 'assigned' ? 'Service Man Assigned' :
                         booking.status}
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-2 rounded-xl">
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Total Cost</div>
                      <div className="text-sm font-bold text-gray-900">₹{booking.totalCost}</div>
                    </div>
                    <div className="bg-gray-50 px-4 py-2 rounded-xl">
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Advance Paid</div>
                      <div className="text-sm font-bold text-orange-600">₹{booking.advancePaid}</div>
                    </div>
                    {booking.status === 'provider-finished' && (
                      <button 
                        onClick={() => confirmCompletion(booking.id)}
                        className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-700 transition-all flex items-center"
                      >
                        <CheckCircle size={16} className="mr-2" /> Confirm Work Finished
                      </button>
                    )}
                    {booking.status === 'completed' && !booking.remainingPaid && (
                      <button 
                        onClick={() => handleRemainingPayment(booking)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center"
                      >
                        <CreditCard size={16} className="mr-2" /> Pay Balance ₹{booking.totalCost - booking.advancePaid}
                      </button>
                    )}
                    {booking.remainingPaid && (
                      <div className="bg-green-50 px-4 py-2 rounded-xl flex items-center">
                        <CheckCircle size={16} className="text-green-600 mr-2" />
                        <span className="text-sm font-bold text-green-600 uppercase">Fully Paid</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-gray-400">Provider</div>
                      <div className="text-sm font-bold text-gray-900">{booking.providerName || 'Assigning...'}</div>
                      {booking.providerPhone && (
                        <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end mt-0.5">
                          <Phone size={10} className="mr-1" /> {booking.providerPhone}
                        </div>
                      )}
                    </div>
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <UserIcon size={20} />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center text-sm text-gray-500">
                  <MapPin size={14} className="mr-2 text-orange-600" />
                  {booking.address}, {booking.city} - {booking.pincode}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
