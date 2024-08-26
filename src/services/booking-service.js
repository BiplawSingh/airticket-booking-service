const axios = require("axios");
const { StatusCodes } = require('http-status-codes');
const { BookingRepository } = require("../repository/index");
const { FLIGHT_SERVICE_PATH } = require("../config/serverConfig");
const { ServiceError } = require("../utils/errors");

class BookingService {
  constructor() {
    this.BookingRepository = new BookingRepository();
  }

  async createBooking(data) {
    try {
      const flightId = data.flightId;
      let getFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flights/${flightId}`;
      const response = await axios.get(getFlightRequestURL);
      const flightData = response.data.data;
      let priceOfTheFlight = flightData.price;
      if (data.noOfSeats > flightData.totalSeats) {
        throw new ServiceError(
            "Booking failed",
            "Insufficient seats",
            StatusCodes.BAD_REQUEST
          );
      }
      const totalCost = priceOfTheFlight * data.noOfSeats;
      const bookingPayload = { ...data, totalCost };
      const booking = await this.BookingRepository.create(bookingPayload);
      const updateFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flights/${booking.flightId}`;
      await axios.patch(updateFlightRequestURL, {
        totalSeats: flightData.totalSeats - booking.noOfSeats,
      });

      // once the booking is finally done, update booking status
      const finalBooking = await this.BookingRepository.update(booking.id, {
        status: "Booked",
      });
      return finalBooking;
    } catch (error) {
      if (
        error.name === "RepositoryError" ||
        error.name === "ValidationError"
      ) {
        throw error;
      }
      throw new ServiceError(
        "Booking failed",
        "Something went wrong in service layer of Booking service",
        StatusCodes.BAD_REQUEST
      );
    }
  }
}

module.exports = BookingService;
