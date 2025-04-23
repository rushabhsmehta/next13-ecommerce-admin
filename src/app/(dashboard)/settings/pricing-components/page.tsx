"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { Plus, Edit, Trash } from "lucide-react"

import { Heading } from "@/components/ui/heading"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const pricingComponentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.string().optional(),
  description: z.string().optional(),
});

type PricingComponentFormValues = z.infer<typeof pricingComponentSchema>

export default function PricingComponentsPage() {
  const [loading, setLoading] = useState(true)
  const [pricingComponents, setPricingComponents] = useState<any[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  const form = useForm<PricingComponentFormValues>({
    resolver: zodResolver(pricingComponentSchema),
    defaultValues: {
      name: "",
      price: "",
      description: "",
    }
  })
  
  useEffect(() => {
    fetchPricingComponents()
  }, [])
  
  const fetchPricingComponents = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/pricing-components")
      setPricingComponents(response.data)
    } catch (error) {
      toast.error("Failed to load pricing components")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: PricingComponentFormValues) => {
    try {
      setLoading(true)
      
      if (isEditMode && editId) {
        // Update existing component
        await axios.patch(`/api/pricing-components/${editId}`, data)
        toast.success("Pricing component updated")
      } else {
        // Create new component
        await axios.post("/api/pricing-components", data)
        toast.success("Pricing component created")
      }
      
      // Refresh the pricing components
      fetchPricingComponents()
      
      // Reset the form and UI state
      form.reset({
        name: "",
        price: "",
        description: "",
      })
      
      setIsEditMode(false)
      setEditId(null)
      setShowForm(false)
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async (id: string) => {
    try {
      setLoading(true)
      await axios.delete(`/api/pricing-components/${id}`)
      toast.success("Pricing component deleted")
      
      // Refresh the pricing components
      fetchPricingComponents()
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const onEdit = async (id: string) => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/pricing-components/${id}`)
      const component = response.data
      
      form.reset({
        name: component.name,
        price: component.price || "",
        description: component.description || "",
      })
      
      setIsEditMode(true)
      setEditId(id)
      setShowForm(true)
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading
            title="Pricing Components"
            description="Manage pricing components for tour packages"
          />
          {!showForm && (
            <Button onClick={() => {
              setIsEditMode(false)
              setEditId(null)
              form.reset({
                name: "",
                price: "",
                description: "",
              })
              setShowForm(true)
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          )}
        </div>
        <Separator />
        
        {/* Component Form - Only shown when adding/editing */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{isEditMode ? "Edit Pricing Component" : "Add New Pricing Component"}</CardTitle>
              <CardDescription>
                Create reusable pricing components to use in your tour package pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Component Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Per Person Cost" />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for this pricing component
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Price (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 5000" />
                        </FormControl>
                        <FormDescription>
                          A default price suggestion for this component
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Description or notes about this component..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        setIsEditMode(false)
                        setEditId(null)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {isEditMode ? "Update Component" : "Create Component"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
        
        <div>
          {pricingComponents.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-500">No pricing components found. Add one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component Name</TableHead>
                  <TableHead>Default Price</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingComponents.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>{component.price || "-"}</TableCell>
                    <TableCell className="max-w-md truncate">{component.description || "-"}</TableCell>
                    <TableCell className="flex space-x-2">
                      <Button variant="outline" size="icon" onClick={() => onEdit(component.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => onDelete(component.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
