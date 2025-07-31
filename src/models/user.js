const mongoose = require('mongoose')
// const { Schema } = mongoose;
const validator = require('validator')
const jwt = require("jsonwebtoken");


const userSchema = new mongoose.Schema(
    {
        // _id: {
        //     type: String
        // }, 
        firstName: {
            type: String,
            required: true,
            minLength: 3,
            maxLength: 30
        },
        lastName: {
            type: String,
            minLength: 3,
            maxLength: 30
        },
        email: {
            type: String,
            unique: true,
            index: true,
            required: true,
            lowercase: true,
            trim: true,
            validate(value) {
                if (!validator.isEmail(value)) {
                    throw new Error("Invalid Email !")
                }

            }

        },
        password: {
            type: String,
            required: true,

            validate(value) {
                if (!validator.isStrongPassword(value)) {
                    throw new Error("Please use a strong password  !")
                }

            }

        },
        gender: {
            type: String,
            //By default only run on post !
            validate(value) {
                if (!["male", "female", "others"].includes(value)) {
                    throw new Error("Gender data is not valid");
                }
            },
        },
        photoURL: {
            type: String,
            default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",

            validate(value) {
                if (!validator.isURL(value)) {
                    throw new Error("Must provide a photoURL !")
                }

            }
        },

        skills: {
            type: [String],
            default: []
        },
        stripeCustomerId: {
            type: String,
            default: null
        },
        wallet: {
            balance: {
                type: Number,
                default: 0,
                min: 0
            },
            transactions: [{
                type: {
                    type: String,
                    enum: ['credit', 'debit'],
                    required: true
                },
                amount: {
                    type: Number,
                    required: true,
                    min: 0
                },
                description: {
                    type: String,
                    required: true
                },
                loanId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'LoanApplication'
                },
                date: {
                    type: Date,
                    default: Date.now
                }
            }]
        },
    }, {
    timestamps: true,
    collection: 'user'
}
)


const User = mongoose.models.User || mongoose.model('User', userSchema)

module.exports = {
    User
}

