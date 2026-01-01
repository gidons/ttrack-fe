import { Protect, RedirectToSignIn } from "@clerk/clerk-react";
import React from "react";
import { Outlet } from "react-router";

export default function ProtectedContent() {
    // return (<Protect fallback={<RedirectToSignIn/>}><Outlet/></Protect>)
    return (<Outlet/>)
}