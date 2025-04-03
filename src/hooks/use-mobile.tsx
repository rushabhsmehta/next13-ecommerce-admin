import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Initial check function
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Run initial check
    checkIfMobile()
    
    // Add resize event listener (more reliable across browsers than matchMedia change event)
    window.addEventListener("resize", checkIfMobile)
    
    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  return !!isMobile
}

