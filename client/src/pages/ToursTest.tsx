import { useState } from 'react';
import { ArrowLeft, DollarSign, TrendingUp, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const mockTourData = {
  id: 'tour-001',
  title: 'Electric Dreams World Tour',
  artistId: 'artist-luna',
  artistName: 'Luna Vibe',
  totalCost: 95540,
  stage: 'completed' as const,
  metadata: {
    cities: 8,
    tourStats: {
      cities: [
        {
          cityNumber: 1,
          cityName: 'Miami',
          venue: 'The Velvet Room',
          capacity: 850,
          ticketsSold: 680,
          attendanceRate: 80,
          revenue: 15400,
          month: 15,
          economics: {
            sellThrough: {
              baseRate: 65,
              reputationBonus: 8,
              popularityBonus: 12,
              marketingBonus: 5,
              rate: 80
            },
            pricing: {
              basePrice: 18,
              capacityBonus: 5,
              ticketPrice: 23
            },
            revenue: {
              tickets: 13800,
              merch: 1600,
              merchRate: 12,
              total: 15400
            },
            costs: {
              venue: 3200,
              production: 2800,
              marketing: 1500,
              total: 7500
            },
            profit: 7900
          }
        },
        {
          cityNumber: 2,
          cityName: 'Atlanta',
          venue: 'Underground Sound',
          capacity: 1200,
          ticketsSold: 960,
          attendanceRate: 80,
          revenue: 24800,
          month: 15,
          economics: {
            sellThrough: {
              baseRate: 70,
              reputationBonus: 10,
              popularityBonus: 15,
              marketingBonus: 8,
              rate: 80
            },
            pricing: {
              basePrice: 22,
              capacityBonus: 6,
              ticketPrice: 28
            },
            revenue: {
              tickets: 22400,
              merch: 2400,
              merchRate: 11,
              total: 24800
            },
            costs: {
              venue: 4800,
              production: 4200,
              marketing: 2200,
              total: 11200
            },
            profit: 13600
          }
        },
        {
          cityNumber: 3,
          cityName: 'Nashville',
          venue: 'Music City Hall',
          capacity: 950,
          ticketsSold: 874,
          attendanceRate: 92,
          revenue: 22600,
          month: 16,
          economics: {
            sellThrough: {
              baseRate: 75,
              reputationBonus: 12,
              popularityBonus: 18,
              marketingBonus: 10,
              rate: 92
            },
            pricing: {
              basePrice: 24,
              capacityBonus: 6,
              ticketPrice: 30
            },
            revenue: {
              tickets: 20220,
              merch: 2380,
              merchRate: 12,
              total: 22600
            },
            costs: {
              venue: 3800,
              production: 3400,
              marketing: 1800,
              total: 9000
            },
            profit: 13600
          }
        },
        {
          cityNumber: 4,
          cityName: 'Chicago',
          venue: 'Windy City Arena',
          capacity: 1500,
          ticketsSold: 1275,
          attendanceRate: 85,
          revenue: 33150,
          month: 16,
          economics: {
            sellThrough: {
              baseRate: 72,
              reputationBonus: 15,
              popularityBonus: 20,
              marketingBonus: 12,
              rate: 85
            },
            pricing: {
              basePrice: 24,
              capacityBonus: 8,
              ticketPrice: 32
            },
            revenue: {
              tickets: 30600,
              merch: 2550,
              merchRate: 8,
              total: 33150
            },
            costs: {
              venue: 6000,
              production: 5400,
              marketing: 2800,
              total: 14200
            },
            profit: 18950
          }
        },
        {
          cityNumber: 5,
          cityName: 'Denver',
          venue: 'Mountain High Club',
          capacity: 750,
          ticketsSold: 600,
          attendanceRate: 80,
          revenue: 15000,
          month: 17,
          economics: {
            sellThrough: {
              baseRate: 68,
              reputationBonus: 10,
              popularityBonus: 15,
              marketingBonus: 7,
              rate: 80
            },
            pricing: {
              basePrice: 22,
              capacityBonus: 3,
              ticketPrice: 25
            },
            revenue: {
              tickets: 13800,
              merch: 1200,
              merchRate: 9,
              total: 15000
            },
            costs: {
              venue: 2850,
              production: 2550,
              marketing: 1700,
              total: 7100
            },
            profit: 7900
          }
        },
        {
          cityNumber: 6,
          cityName: 'Seattle',
          venue: 'Emerald Sound Stage',
          capacity: 1100,
          ticketsSold: 946,
          attendanceRate: 86,
          revenue: 26334,
          month: 17,
          economics: {
            sellThrough: {
              baseRate: 74,
              reputationBonus: 18,
              popularityBonus: 25,
              marketingBonus: 15,
              rate: 86
            },
            pricing: {
              basePrice: 26,
              capacityBonus: 7,
              ticketPrice: 33
            },
            revenue: {
              tickets: 24200,
              merch: 2134,
              merchRate: 9,
              total: 26334
            },
            costs: {
              venue: 4400,
              production: 3960,
              marketing: 2100,
              total: 10460
            },
            profit: 15874
          }
        },
        {
          cityNumber: 7,
          cityName: 'Los Angeles',
          venue: 'Hollywood Dreams Theater',
          capacity: 2000,
          ticketsSold: 1800,
          attendanceRate: 90,
          revenue: 54000,
          month: 18,
          economics: {
            sellThrough: {
              baseRate: 80,
              reputationBonus: 22,
              popularityBonus: 28,
              marketingBonus: 20,
              rate: 90
            },
            pricing: {
              basePrice: 28,
              capacityBonus: 10,
              ticketPrice: 38
            },
            revenue: {
              tickets: 50400,
              merch: 3600,
              merchRate: 7,
              total: 54000
            },
            costs: {
              venue: 8000,
              production: 7200,
              marketing: 3800,
              total: 19000
            },
            profit: 35000
          }
        },
        {
          cityNumber: 8,
          cityName: 'New York',
          venue: 'Empire State Music Hall',
          capacity: 1800,
          ticketsSold: 1674,
          attendanceRate: 93,
          revenue: 58590,
          month: 18,
          economics: {
            sellThrough: {
              baseRate: 82,
              reputationBonus: 25,
              popularityBonus: 30,
              marketingBonus: 22,
              rate: 93
            },
            pricing: {
              basePrice: 32,
              capacityBonus: 8,
              ticketPrice: 40
            },
            revenue: {
              tickets: 53760,
              merch: 4830,
              merchRate: 9,
              total: 58590
            },
            costs: {
              venue: 7200,
              production: 6480,
              marketing: 3400,
              total: 17080
            },
            profit: 41510
          }
        }
      ]
    }
  }
};

function TableDashboardView({ tour }: { tour: typeof mockTourData }) {
  const [sortBy, setSortBy] = useState<'city' | 'revenue' | 'profit' | 'attendance'>('city');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedCities = [...tour.metadata.tourStats.cities].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'city':
        aVal = a.cityName;
        bVal = b.cityName;
        break;
      case 'revenue':
        aVal = a.revenue;
        bVal = b.revenue;
        break;
      case 'profit':
        aVal = a.economics.profit;
        bVal = b.economics.profit;
        break;
      case 'attendance':
        aVal = a.attendanceRate;
        bVal = b.attendanceRate;
        break;
      default:
        aVal = a.cityNumber;
        bVal = b.cityNumber;
    }

    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const totals = tour.metadata.tourStats.cities.reduce(
    (acc, city) => ({
      revenue: acc.revenue + city.revenue,
      profit: acc.profit + city.economics.profit,
      tickets: acc.tickets + city.ticketsSold,
      capacity: acc.capacity + city.capacity,
      costs: acc.costs + city.economics.costs.total
    }),
    { revenue: 0, profit: 0, tickets: 0, capacity: 0, costs: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Data Table */}
      <Card className="bg-[#2C222A] border-[#4e324c]">
        <CardHeader>
          <CardTitle className="text-white">{tour.title} - {tour.artistName} • {tour.metadata.cities} Cities • Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="text-white cursor-pointer hover:text-[#A75A5B]"
                  onClick={() => handleSort('city')}
                >
                  City {sortBy === 'city' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-white">Venue</TableHead>
                <TableHead
                  className="text-white cursor-pointer hover:text-[#A75A5B] text-right"
                  onClick={() => handleSort('attendance')}
                >
                  Attendance {sortBy === 'attendance' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="text-white cursor-pointer hover:text-[#A75A5B] text-right"
                  onClick={() => handleSort('revenue')}
                >
                  Revenue {sortBy === 'revenue' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-white text-right">Costs</TableHead>
                <TableHead
                  className="text-white cursor-pointer hover:text-[#A75A5B] text-right"
                  onClick={() => handleSort('profit')}
                >
                  Profit {sortBy === 'profit' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-white text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCities.map((city) => (
                <TableRow key={city.cityNumber} className="border-[#4e324c]">
                  <TableCell className="text-white font-medium">{city.cityName}</TableCell>
                  <TableCell className="text-white/70">{city.venue}</TableCell>
                  <TableCell className="text-right text-white">
                    <div>{city.ticketsSold.toLocaleString()}/{city.capacity.toLocaleString()}</div>
                    <div className="text-xs text-[#A75A5B]">{city.attendanceRate}%</div>
                  </TableCell>
                  <TableCell className="text-right text-green-400 font-mono">
                    ${city.revenue.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-red-400 font-mono">
                    ${city.economics.costs.total.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-green-400 font-mono">
                    ${city.economics.profit.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-white font-mono">
                    {Math.round((city.economics.profit / city.economics.costs.total) * 100)}%
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow className="border-t-2 border-[#A75A5B] bg-[#3C252D]/30">
                <TableCell className="text-white font-bold">TOTALS</TableCell>
                <TableCell className="text-white/70">-</TableCell>
                <TableCell className="text-right text-white font-bold">
                  <div>{totals.tickets.toLocaleString()}</div>
                  <div className="text-xs text-[#A75A5B]">{Math.round((totals.tickets / totals.capacity) * 100)}%</div>
                </TableCell>
                <TableCell className="text-right text-green-400 font-mono font-bold">
                  ${totals.revenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-red-400 font-mono font-bold">
                  ${totals.costs.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-green-400 font-mono font-bold">
                  ${totals.profit.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-white font-mono font-bold">
                  {Math.round((totals.profit / totals.costs) * 100)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ToursTest() {
  return (
    <div className="min-h-screen bg-[#2C222A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-[#4e324c]"></div>
            <h1 className="text-2xl font-bold text-white">Tour Performance</h1>
          </div>
        </div>

        {/* Data Table View */}
        <TableDashboardView tour={mockTourData} />
      </div>
    </div>
  );
}