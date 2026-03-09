import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Booking } from '../types';
import { Briefcase, Clock, CheckCircle, MapPin, Phone, User, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

export default function ProviderDashboard() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'bookings'), 
        where('providerId', '==', user.uid)
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
      console.error("Error fetching provider bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [user]);

  const updateStatus = async (bookingId: string, status: string) => {
    await updateDoc(doc(db, 'bookings', bookingId), { status });
    fetchBookings();
  };

  if (!profile?.isApproved) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-12 text-center">
          <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Approval Pending</h2>
          <p className="text-gray-600">Your account is currently under review by the admin. You will be able to accept jobs once approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="flex items-center space-x-6">
            <img src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} className="w-20 h-20 rounded-3xl shadow-lg" alt="" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Provider Panel</h1>
              <p className="text-gray-500">Welcome back, {profile?.displayName}</p>
            </div>
          </div>
          <button 
            onClick={() => { setLoading(true); fetchBookings(); }}
            className="flex items-center justify-center space-x-2 bg-white px-6 py-3 rounded-xl font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Jobs</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Jobs */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Briefcase size={20} className="mr-2 text-orange-600" /> Assigned Jobs
            </h2>
            
            {loading ? (
              <div className="text-center py-10">Loading jobs...</div>
            ) : bookings.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                <p className="text-gray-400">No jobs assigned yet. Check back later!</p>
              </div>
            ) : (
              bookings.map(booking => (
                <div key={booking.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        booking.status === 'completed' ? 'bg-green-100 text-green-600' :
                        booking.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                        booking.status === 'reached' ? 'bg-purple-100 text-purple-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {booking.status}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 mt-2">{booking.serviceName}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Total Payout</div>
                      <div className="text-lg font-bold text-green-600">₹{booking.totalCost * 0.9}</div>
                      <div className="text-[10px] text-gray-400">(90% of ₹{booking.totalCost})</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <User size={16} className="mr-2 text-gray-400" /> {booking.userName}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone size={16} className="mr-2 text-gray-400" /> {booking.userPhone}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={16} className="mr-2 text-gray-400" /> {booking.serviceDate}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock size={16} className="mr-2 text-gray-400" /> {booking.serviceTime}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl mb-6 flex items-start">
                    <MapPin size={18} className="mr-3 text-orange-600 mt-1 flex-shrink-0" />
                    <div className="text-sm text-gray-700">
                      {booking.address}, {booking.city} - {booking.pincode}
                    </div>
                  </div>

                  {booking.status !== 'completed' && (
                    <div className="flex flex-col space-y-3">
                      {booking.status === 'assigned' && (
                        <button 
                          onClick={() => updateStatus(booking.id, 'in-progress')}
                          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center"
                        >
                          <Clock size={18} className="mr-2" /> Start Work
                        </button>
                      )}
                      {booking.status === 'in-progress' && (
                        <button 
                          onClick={() => updateStatus(booking.id, 'provider-finished')}
                          className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center"
                        >
                          <CheckCircle size={18} className="mr-2" /> Finish Work
                        </button>
                      )}
                      {booking.status === 'provider-finished' && (
                        <div className="text-center p-3 bg-orange-50 text-orange-700 rounded-xl text-sm font-bold flex items-center justify-center">
                          <Clock size={16} className="mr-2" /> Waiting for User Confirmation
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold mb-6">Your Performance</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Completed Jobs</span>
                  <span className="font-bold text-gray-900">{bookings.filter(b => b.status === 'completed').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Total Earnings</span>
                  <span className="font-bold text-green-600">₹{bookings.filter(b => b.status === 'completed').reduce((acc, b) => acc + (b.totalCost * 0.9), 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Rating</span>
                  <span className="font-bold text-orange-500">4.9/5</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-600 rounded-3xl p-8 text-white shadow-xl shadow-orange-600/20">
              <h3 className="font-bold mb-4">Need Help?</h3>
              <p className="text-orange-100 text-sm mb-6">Contact admin support for any issues with bookings or payments.</p>
              <button className="w-full bg-white text-orange-600 py-3 rounded-xl font-bold hover:bg-orange-50 transition-all">
                Call Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
