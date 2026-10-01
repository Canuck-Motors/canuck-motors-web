"use client"
import { useState } from "react";
import { createClient } from "@/lib/supabase/client"

export default function RegisterPage(){
    const supabase = createClient();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleRegister = async (e: any) => 
    {
        e.preventDefault();
        const { data, error } = await supabase.auth.signUp({
            email, 
            password,
            options : {
                data : {
                    first_name : firstName,
                    last_name : lastName
                }
            }
        });  
        
        if(error){
            setMessage(error.message);
            return;
        }

        setMessage("Registration successful. Check your email if confirmation is enabled.");
    };

    return(
        <main>
            <h1>Register</h1>

            <form onSubmit = {handleRegister}>
                <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)}></input>

                <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)}></input>

                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}></input>

                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}></input>
            
                <button type="submit">Register</button>
            </form>

            <p>{message}</p>
        </main>
    );
}