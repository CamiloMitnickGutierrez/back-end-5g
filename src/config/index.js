const dotenv = require('dotenv')

dotenv.config()

module.exports = {

    PORT: process.env.PORT || 4000,
    MONGO_URI: process.env.MONGO_URI  

}