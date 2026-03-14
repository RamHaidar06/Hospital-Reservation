import { useEffect, useState } from "react";

export default function DoctorReviews({ setPage }) {

const [reviews, setReviews] = useState([]);

useEffect(() => {

fetch("http://localhost:5000/api/doctor/reviews", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }
})
.then(res => res.json())
.then(data => setReviews(data));

}, []);

return (

<div style={{padding:"20px"}}>

<h2>My Reviews</h2>

{reviews.length === 0 ? (

<p>No reviews yet</p>

) : (

reviews.map((review) => (

<div key={review._id} style={{
border:"1px solid #ddd",
padding:"15px",
marginBottom:"10px",
borderRadius:"10px"
}}>

<h3>{review.patient_id?.name}</h3>

<p>{review.comment}</p>

<p>Rating: {review.rating}/5</p>

<small>{new Date(review.createdAt).toLocaleDateString()}</small>

</div>

))

)}

</div>

);

}
