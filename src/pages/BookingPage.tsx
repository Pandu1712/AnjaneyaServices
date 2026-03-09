import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Service, Location, Booking } from '../types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  ChevronRight, 
  CheckCircle,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function BookingPage() {
  const { serviceId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [service, setService] = useState<Service | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingStep, setBookingStep] = useState(1);
  const [isPaying, setIsPaying] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: profile?.displayName || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: '',
    pincode: '',
    locationId: '',
    serviceDate: '',
    serviceTime: '',
    notes: ''
  });

  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!serviceId) return;
      
      const serviceDoc = await getDoc(doc(db, 'services', serviceId));
      if (serviceDoc.exists()) {
        setService({ id: serviceDoc.id, ...serviceDoc.data() } as Service);
      }
      
      const locationsSnap = await getDocs(collection(db, 'locations'));
      setLocations(locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
      
      setLoading(false);
    };
    fetchData();
  }, [serviceId]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'address' && value.length > 2) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${value}&addressdetails=1&limit=5`);
        const data = await res.json();
        setAddressSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    } else if (name === 'address') {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: any) => {
    setFormData({ 
      ...formData, 
      address: suggestion.display_name,
      city: suggestion.address.city || suggestion.address.town || suggestion.address.village || '',
      pincode: suggestion.address.postcode || ''
    });
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStep(3); // Move to payment step
  };

  const handlePayment = async () => {
    if (!user || !service) return;
    
    const advanceAmount = service.baseCost * 0.2;
    
    // Razorpay Integration
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
      amount: advanceAmount * 100, // Amount in paise
      currency: "INR",
      name: "Anjaneya Services",
      description: `Advance Payment for ${service.name}`,
      image: service.imageUrl,
      handler: async function (response: any) {
        setLoading(true);
        setIsPaying(true);
        
        try {
          const bookingData: Omit<Booking, 'id'> = {
            userId: user.uid,
            userName: formData.fullName,
            userPhone: formData.phone,
            address: formData.address,
            city: formData.city,
            pincode: formData.pincode,
            locationId: formData.locationId,
            serviceId: service.id,
            serviceName: service.name,
            serviceDate: formData.serviceDate,
            serviceTime: formData.serviceTime,
            notes: formData.notes,
            status: 'pending',
            totalCost: service.baseCost,
            advancePaid: advanceAmount,
            remainingPaid: false,
            createdAt: serverTimestamp(),
            paymentId: response.razorpay_payment_id
          };

          await addDoc(collection(db, 'bookings'), bookingData);
          setBookingStep(4); // Success step
        } catch (error) {
          console.error('Booking error:', error);
          alert("Booking failed. Please contact support.");
        } finally {
          setLoading(false);
          setIsPaying(false);
        }
      },
      prefill: {
        name: formData.fullName,
        email: user.email,
        contact: formData.phone
      },
      theme: {
        color: "#059669" // Emerald 600
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Using a free reverse geocoding API (Nominatim)
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
            const data = await res.json();
            if (data && data.display_name) {
              setFormData(prev => ({ 
                ...prev, 
                address: data.display_name,
                city: data.address.city || data.address.town || data.address.village || '',
                pincode: data.address.postcode || ''
              }));
            } else {
              setFormData(prev => ({ ...prev, address: `Lat: ${position.coords.latitude}, Lng: ${position.coords.longitude}` }));
            }
          } catch (err) {
            setFormData(prev => ({ ...prev, address: `Lat: ${position.coords.latitude}, Lng: ${position.coords.longitude}` }));
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLoading(false);
          alert("Could not get your location. Please enter it manually.");
        }
      );
    }
  };

  const isLocationAvailable = !formData.locationId || (service?.locationIds || []).includes(formData.locationId);

  if (loading && bookingStep === 1) return <div className="pt-32 text-center">Loading...</div>;
  if (!service) return <div className="pt-32 text-center">Service not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${bookingStep >= step ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step === 4 && bookingStep === 4 ? <CheckCircle size={20} /> : step}
              </div>
              {step < 4 && (
                <div className={`flex-1 h-1 mx-4 ${bookingStep > step ? 'bg-emerald-600' : 'bg-gray-200'}`}></div>
              )}
            </div>
          ))}
        </div>

        {bookingStep === 1 && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 bg-gray-900 p-8 text-white">
                <img src={service.imageUrl} alt={service.name} className="w-full h-48 object-cover rounded-2xl mb-6" />
                <h2 className="text-2xl font-bold mb-2">{service.name}</h2>
                <p className="text-gray-400 text-sm mb-6">{service.description}</p>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Base Cost</span>
                    <span className="font-bold">₹{service.baseCost}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Advance (20%)</span>
                    <span className="font-bold text-emerald-500">₹{service.baseCost * 0.2}</span>
                  </div>
                </div>
              </div>
              
              <div className="md:w-2/3 p-8">
                <form onSubmit={(e) => { e.preventDefault(); setBookingStep(2); }} className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Service Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Calendar size={16} className="mr-2 text-emerald-600" /> Service Date
                      </label>
                      <input 
                        required 
                        type="date" 
                        name="serviceDate"
                        value={formData.serviceDate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Clock size={16} className="mr-2 text-emerald-600" /> Preferred Time
                      </label>
                      <select 
                        required 
                        name="serviceTime"
                        value={formData.serviceTime}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">Select Time Slot</option>
                        <option value="09:00 AM">09:00 AM - 11:00 AM</option>
                        <option value="11:00 AM">11:00 AM - 01:00 PM</option>
                        <option value="02:00 PM">02:00 PM - 04:00 PM</option>
                        <option value="04:00 PM">04:00 PM - 06:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <MapPin size={16} className="mr-2 text-emerald-600" /> Select Area / Location
                    </label>
                    <select 
                      required 
                      name="locationId"
                      value={formData.locationId}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 transition-all ${!isLocationAvailable ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-200 focus:ring-emerald-500'}`}
                    >
                      <option value="">Choose your area</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                    {!isLocationAvailable && (
                      <div className="mt-2 text-sm text-red-600 flex items-center animate-in fade-in slide-in-from-top-1">
                        <AlertCircle size={14} className="mr-1" /> {service.name} is not available in your location.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FileText size={16} className="mr-2 text-emerald-600" /> Additional Notes
                    </label>
                    <textarea 
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3} 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                      placeholder="Any specific instructions..."
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    disabled={!isLocationAvailable}
                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Address <ChevronRight className="ml-2" size={20} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {bookingStep === 2 && (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Contact & Address</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <User size={16} className="mr-2 text-emerald-600" /> Full Name
                  </label>
                  <input 
                    required 
                    type="text" 
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Phone size={16} className="mr-2 text-emerald-600" /> Phone Number
                  </label>
                  <input 
                    required 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                  />
                </div>
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center">
                    <MapPin size={16} className="mr-2 text-emerald-600" /> Full Address
                  </label>
                  <button 
                    type="button"
                    onClick={getCurrentLocation}
                    className="text-xs text-emerald-600 font-bold flex items-center hover:underline"
                  >
                    <MapPin size={14} className="mr-1" /> Use Current Location
                  </button>
                </div>
                <input 
                  required 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none mb-4" 
                  placeholder="House No, Building, Street..."
                />
                
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-2xl shadow-2xl mt-[-1rem] max-h-60 overflow-y-auto">
                    {addressSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className="w-full text-left px-4 py-4 text-sm hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0 flex items-start group"
                      >
                        <div className="bg-gray-100 p-2 rounded-lg mr-4 group-hover:bg-emerald-100 transition-colors">
                          <MapPin size={18} className="text-gray-400 group-hover:text-emerald-600" />
                        </div>
                        <span className="text-gray-700 leading-relaxed">{suggestion.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <input 
                    required 
                    type="text" 
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                    placeholder="City" 
                  />
                  <input 
                    required 
                    type="text" 
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                    placeholder="Pincode" 
                  />
                </div>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <h4 className="font-bold text-emerald-900 mb-4">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Service Charge</span>
                    <span className="font-bold">₹{service.baseCost}</span>
                  </div>
                  <div className="flex justify-between text-lg pt-2 border-t border-emerald-200">
                    <span className="font-bold text-emerald-900">Pay Now (20% Advance)</span>
                    <span className="font-bold text-emerald-600">₹{service.baseCost * 0.2}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button 
                  type="button" 
                  onClick={() => setBookingStep(1)}
                  className="flex-1 py-4 rounded-xl font-bold border-2 border-gray-100 text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm & Pay Advance'}
                </button>
              </div>
            </form>
          </div>
        )}

        {bookingStep === 3 && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2 p-8 border-r border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <CreditCard className="mr-3 text-emerald-600" /> Payment Details
                </h3>
                
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">Payment Method</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-8 bg-emerald-600 rounded flex items-center justify-center text-white font-bold text-[10px] mr-3">
                          VISA
                        </div>
                        <span className="text-sm font-bold">Card ending in 4242</span>
                      </div>
                      <span className="text-xs text-emerald-600 font-bold">Change</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <ShieldCheck size={18} className="text-emerald-500 mr-2" />
                      Secure 256-bit SSL encrypted payment
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <ShieldCheck size={18} className="text-emerald-500 mr-2" />
                      100% Satisfaction Guarantee
                    </div>
                  </div>

                  <button 
                    onClick={handlePayment}
                    disabled={isPaying}
                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    {isPaying ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Processing Payment...
                      </>
                    ) : (
                      <>Pay ₹{service.baseCost * 0.2} Now <ArrowRight className="ml-2" size={20} /></>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => setBookingStep(2)}
                    disabled={isPaying}
                    className="w-full text-gray-500 text-sm font-bold hover:text-gray-700 transition-all"
                  >
                    Cancel and go back
                  </button>
                </div>
              </div>

              <div className="md:w-1/2 bg-gray-50 p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <div className="flex items-center">
                      <img src={service.imageUrl} alt={service.name} className="w-12 h-12 rounded-lg object-cover mr-4" />
                      <div>
                        <p className="font-bold text-gray-900">{service.name}</p>
                        <p className="text-xs text-gray-500">{formData.serviceDate} at {formData.serviceTime}</p>
                      </div>
                    </div>
                    <span className="font-bold">₹{service.baseCost}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Service Fee</span>
                      <span>₹{service.baseCost}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Taxes & GST</span>
                      <span className="text-emerald-600">Included</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Total Amount</span>
                      <span className="text-2xl font-bold text-gray-900">₹{service.baseCost}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 p-3 bg-emerald-100 rounded-lg">
                      <span className="text-sm font-bold text-emerald-800">Payable Now (Advance)</span>
                      <span className="text-lg font-bold text-emerald-600">₹{service.baseCost * 0.2}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {bookingStep === 4 && (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Your service request has been received. Our admin will assign a service provider shortly. You can track the status in your dashboard.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-emerald-600 transition-all"
              >
                Go to Dashboard
              </button>
              <button 
                onClick={() => navigate('/')}
                className="bg-white border-2 border-gray-100 text-gray-700 px-8 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
