const Chats = require("../../models/rides_post/Chat_Insilized");

exports.foundChatInitialized = async (req, res) => {
  try {
    const driverId = req.user._id.toString();

    let chats = await Chats.find({
      $or: [
        { init_driver_id: driverId },
        { other_driver_id: driverId },
      ],
    })
      .populate("ride_post_id")
      .populate("init_driver_id", "driver_name profile_image")
      .populate("other_driver_id", "driver_name profile_image")
      .sort({ lastMessageAt: -1 });

    // Add role flags + full ride data
    chats = chats.map((chat) => {
      const isInitializer = chat.init_driver_id?._id?.toString() === driverId;
      const isOwner = chat.other_driver_id?._id?.toString() === driverId;

      return {
        ...chat.toObject(),
        isInitializedByMe: isInitializer,
        isRideOwner: isOwner,
        myRole: isInitializer ? "initiator" : isOwner ? "ride_owner" : "none",
        rideData: chat.ride_post_id,
      };
    });

    return res.status(200).json({
      success: true,
      chats,
      count: chats.length,
    });

  } catch (error) {
    console.error("❌ Error fetching chats:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
