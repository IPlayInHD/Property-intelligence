import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useCreateAnalysis, 
  useScrapeListingUrl, 
  useGetCommunities, 
  PropertyInputPropertyType, 
  PropertyInputEmirate, 
  PropertyInputListingType, 
  PropertyInputViewType, 
  PropertyInputFurnished 
} from "@workspace/api-client-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, Link as LinkIcon, Building, ArrowRight, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const manualSchema = z.object({
  propertyType: z.nativeEnum(PropertyInputPropertyType),
  emirate: z.nativeEnum(PropertyInputEmirate),
  community: z.string().min(1, "Community is required"),
  buildingName: z.string().optional(),
  floorNumber: z.coerce.number().optional(),
  sizeSqft: z.coerce.number().min(100, "Size must be at least 100 sqft"),
  bedrooms: z.coerce.number().min(0),
  bathrooms: z.coerce.number().optional(),
  listedPrice: z.coerce.number().min(1000, "Price must be greater than 1000"),
  listingType: z.nativeEnum(PropertyInputListingType),
  viewType: z.nativeEnum(PropertyInputViewType).optional(),
  parkingIncluded: z.boolean().default(false),
  furnished: z.nativeEnum(PropertyInputFurnished).optional(),
  yearBuilt: z.coerce.number().optional(),
});

export default function AnalysisNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [propertyData, setPropertyData] = useState<z.infer<typeof manualSchema> | null>(null);
  
  const { data: communities } = useGetCommunities();
  
  const createMutation = useCreateAnalysis({
    mutation: {
      onSuccess: (data) => {
        setLocation(`/analysis/${data.id}`);
      },
      onError: (error) => {
        toast({ title: "Failed to start analysis", description: error.data?.message || "Unknown error", variant: "destructive" });
      }
    }
  });

  const scrapeMutation = useScrapeListingUrl({
    mutation: {
      onSuccess: (data) => {
        const p: any = {
          propertyType: data.propertyType || PropertyInputPropertyType.apartment,
          emirate: data.emirate || PropertyInputEmirate.Dubai,
          community: data.community || "Downtown Dubai",
          sizeSqft: data.sizeSqft || 1000,
          bedrooms: data.bedrooms || 1,
          listedPrice: data.price || 1500000,
          listingType: PropertyInputListingType.sale, // Default
        };
        setPropertyData(p);
        setStep(2);
      },
      onError: (error) => {
        toast({ title: "Failed to parse URL", description: "Please enter property details manually.", variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof manualSchema>>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      propertyType: PropertyInputPropertyType.apartment,
      emirate: PropertyInputEmirate.Dubai,
      community: "",
      sizeSqft: 0,
      bedrooms: 1,
      listedPrice: 0,
      listingType: PropertyInputListingType.sale,
      parkingIncluded: false,
    },
  });

  const handleManualSubmit = (values: z.infer<typeof manualSchema>) => {
    setPropertyData(values);
    setStep(2);
  };

  const handleUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = new FormData(e.currentTarget).get("url") as string;
    if (!url) return;
    scrapeMutation.mutate({ data: { url } });
  };

  const runAnalysis = () => {
    if (!propertyData) return;
    createMutation.mutate({ data: propertyData as any });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold mb-2">New Analysis</h1>
        <p className="text-muted-foreground">Enter property details to run the valuation models.</p>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-card border border-border/50 p-1 h-auto">
                <TabsTrigger value="url" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Paste URL
                </TabsTrigger>
                <TabsTrigger value="manual" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Building className="h-4 w-4 mr-2" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="url">
                <Card className="bg-card/80 backdrop-blur border-border/50">
                  <CardHeader>
                    <CardTitle>Analyse from Portal URL</CardTitle>
                    <CardDescription>Paste a link from Property Finder, Bayut, or Dubizzle.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUrlSubmit} className="flex gap-4">
                      <Input name="url" placeholder="https://www.propertyfinder.ae/en/buy/..." className="flex-1 h-12 bg-background/50" />
                      <Button type="submit" disabled={scrapeMutation.isPending} className="h-12 px-8">
                        {scrapeMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Extract Details"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manual">
                <Card className="bg-card/80 backdrop-blur border-border/50">
                  <CardHeader>
                    <CardTitle>Property Details</CardTitle>
                    <CardDescription>Provide specific data for a more accurate analysis.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleManualSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="listingType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Listing Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select type" /></SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value={PropertyInputListingType.sale}>Sale</SelectItem>
                                    <SelectItem value={PropertyInputListingType.rent}>Rent</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="propertyType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Property Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select type" /></SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.values(PropertyInputPropertyType).map(t => (
                                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="emirate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Emirate</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select emirate" /></SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.values(PropertyInputEmirate).map(e => (
                                      <SelectItem key={e} value={e}>{e.replace("_", " ")}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="community"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Community</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select community" /></SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {communities?.slice(0, 20).map((c: any) => (
                                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                    <SelectItem value="Downtown Dubai">Downtown Dubai</SelectItem>
                                    <SelectItem value="Dubai Marina">Dubai Marina</SelectItem>
                                    <SelectItem value="Palm Jumeirah">Palm Jumeirah</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sizeSqft"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Size (SqFt)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} className="bg-background/50 font-mono" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="bedrooms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bedrooms</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} className="bg-background/50 font-mono" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="listedPrice"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Listed Price (AED)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} className="bg-background/50 font-mono text-lg" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end">
                          <Button type="submit" className="gap-2">
                            Review Details <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {step === 2 && propertyData && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-card/80 backdrop-blur border-border/50 border-primary/30">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-xl">Confirm Property Details</CardTitle>
                <CardDescription>Verify the extracted data before running the intelligence models.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Property</div>
                    <div className="font-medium capitalize">{propertyData.bedrooms} Bed {propertyData.propertyType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Location</div>
                    <div className="font-medium">{propertyData.community}, {propertyData.emirate}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Size</div>
                    <div className="font-medium font-mono">{propertyData.sizeSqft} sqft</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Price</div>
                    <div className="font-bold text-primary font-mono">AED {propertyData.listedPrice.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-border/50 pt-6">
                <Button variant="outline" onClick={() => setStep(1)} disabled={createMutation.isPending}>
                  Back
                </Button>
                <Button onClick={runAnalysis} disabled={createMutation.isPending} className="gap-2 px-8">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Running Models...
                    </>
                  ) : (
                    <>
                      <Activity className="h-5 w-5" />
                      Run PropIQ Analysis
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
